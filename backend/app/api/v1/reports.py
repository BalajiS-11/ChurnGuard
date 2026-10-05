import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.app.core.deps import get_db, get_current_user, require_roles
from backend.app.db.models import User, Customer
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/export")
def export_reports(
    type: str = Query("csv", regex="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("manager", "admin", "analyst")),
    db: Session = Depends(get_db)
):
    customers = (
        db.query(Customer)
        .filter(Customer.is_deleted == False)
        .order_by(Customer.latest_probability.desc().nulls_last())
        .limit(1000)
        .all()
    )
    
    log_audit_event(db, f"report_export_{type}", user_id=current_user.id)
    
    if type == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "CustomerId", "Surname", "CreditScore", "Geography", "Gender",
            "Age", "Tenure", "Balance", "NumOfProducts", "IsActiveMember",
            "ChurnProbability", "RiskTier"
        ])
        
        for c in customers:
            # Mask surname if analyst
            s_name = c.surname
            if current_user.role == "analyst" and s_name and len(s_name) > 2:
                s_name = s_name[0] + "***" + s_name[-1]
            writer.writerow([
                c.external_id, s_name, c.credit_score, c.geography, c.gender,
                c.age, c.tenure, c.balance, c.num_of_products, c.is_active_member,
                round(c.latest_probability or 0.0, 4), c.latest_risk_tier
            ])
            
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=churnguard_executive_report_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
        
    elif type == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=12
        )
        sub_style = ParagraphStyle(
            'ReportSub',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=20
        )
        
        elements.append(Paragraph("ChurnGuard · Executive Retention Intelligence Report", title_style))
        elements.append(Paragraph(f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')} | User: {current_user.full_name} ({current_user.role.upper()})", sub_style))
        elements.append(Spacer(1, 10))
        
        # Summary table
        total_c = len(customers)
        high_risk_c = sum(1 for c in customers if c.latest_risk_tier in ("high", "critical"))
        summary_data = [
            ["Metric", "Value"],
            ["Total Evaluated Portfolio", f"{total_c:,} customers"],
            ["High & Critical Risk Volume", f"{high_risk_c:,} customers ({high_risk_c/total_c*100:.1f}%)"],
            ["Active Model Version", "v1.0.0 (XGBoost Calibrated)"],
            ["Decision Threshold", "0.140 (Cost-Optimal FN:FP = 5:1)"],
            ["Model Performance (Test ROC-AUC)", "0.8592"]
        ]
        
        t = Table(summary_data, colWidths=[240, 260])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
        
        # Top 10 high risk table
        elements.append(Paragraph("Top High-Risk Accounts Requiring Immediate Outreach", styles['Heading2']))
        elements.append(Spacer(1, 8))
        
        top_data = [["Customer ID", "Geography", "Age", "Balance (€)", "Products", "Risk Tier", "Probability"]]
        for c in customers[:10]:
            top_data.append([
                str(c.external_id),
                c.geography,
                str(c.age),
                f"{c.balance:,.2f}",
                str(c.num_of_products),
                (c.latest_risk_tier or "").upper(),
                f"{(c.latest_probability or 0.0):.1%}"
            ])
            
        t2 = Table(top_data, colWidths=[80, 70, 45, 95, 60, 75, 75])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t2)
        
        doc.build(elements)
        buffer.seek(0)
        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=churnguard_report_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )
