import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user, require_roles
from backend.app.db.session import SessionLocal
from backend.app.db.models import User, Prediction, PredictionDriver, BatchJob, Customer, ModelVersion
from backend.app.schemas.schemas import PredictRequest, PredictResponse, WhatIfRequest, WhatIfResponse, BatchJobResponse
from backend.app.services.prediction_service import predict_single, simulate_whatif
from backend.app.services.batch_service import process_batch_job
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("", response_model=PredictResponse)
@router.post("/single", response_model=PredictResponse)
def score_single(
    request: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer_dict = request.dict()
    res = predict_single(customer_dict, with_explain=True)
    
    # Save prediction if customer exists
    if request.customer_id:
        active_model = db.query(ModelVersion).filter(ModelVersion.status == "active").first()
        model_id = active_model.id if active_model else "default"
        
        pred_record = Prediction(
            customer_id=request.customer_id,
            model_id=model_id,
            requested_by=current_user.id,
            input_features=customer_dict,
            probability=res["probability"],
            risk_tier=res["risk_tier"],
            predicted_churn=res["predicted_churn"],
            is_whatif=False,
            latency_ms=res["latency_ms"]
        )
        db.add(pred_record)
        db.flush()
        
        # Save drivers
        for d in res["drivers"]:
            driver_rec = PredictionDriver(
                prediction_id=pred_record.id,
                rank=d["rank"],
                feature=d["feature"],
                feature_value=str(d.get("feature_value", "")),
                shap_value=d["shap_value"],
                direction=d["direction"],
                reason_text=d["reason_text"]
            )
            db.add(driver_rec)
            
        # Update latest customer risk
        customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
        if customer:
            customer.latest_probability = res["probability"]
            customer.latest_risk_tier = res["risk_tier"]
            
        db.commit()
        
    return res

@router.post("/whatif", response_model=WhatIfResponse)
@router.post("/what-if", response_model=WhatIfResponse)
def simulate_whatif_scenario(
    request: WhatIfRequest,
    current_user: User = Depends(get_current_user)
):
    base_dict = request.base_features.dict()
    mod_dict = request.modified_features.dict()
    return simulate_whatif(base_dict, mod_dict)

@router.post("/batch", response_model=BatchJobResponse)
async def create_batch_scoring_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("admin", "manager", "analyst")),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content_bytes = await file.read()
    csv_content = content_bytes.decode("utf-8", errors="replace")
    
    active_model = db.query(ModelVersion).filter(ModelVersion.status == "active").first()
    
    job = BatchJob(
        submitted_by=current_user.id,
        file_name=file.filename,
        status="queued",
        model_id=active_model.id if active_model else None
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Run processing asynchronously in background
    background_tasks.add_task(process_batch_job, job.id, csv_content, SessionLocal)
    log_audit_event(db, "batch_submit", user_id=current_user.id, entity_type="batch_job", entity_id=job.id)
    
    return job

@router.get("/batch/{job_id}", response_model=BatchJobResponse)
def get_batch_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Batch job not found")
    return job

@router.get("/batch/{job_id}/download")
def download_batch_results(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Batch job not found")
        
    if job.status != "completed" or not job.result_path or not os.path.exists(job.result_path):
        raise HTTPException(status_code=400, detail="Batch results not ready or file missing")
        
    log_audit_event(db, "batch_export", user_id=current_user.id, entity_type="batch_job", entity_id=job.id)
    return FileResponse(
        path=job.result_path,
        media_type="text/csv",
        filename=f"churnguard_scored_{job.file_name}"
    )
