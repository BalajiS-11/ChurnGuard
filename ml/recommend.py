from typing import Dict, Any, List

def generate_recommendations(features: Dict[str, Any], drivers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rule + SHAP-driven Next-Best-Action recommendation engine.
    Returns prioritized list of actionable retention steps.
    """
    recommendations = []
    seen_titles = set()
    
    # Extract feature values safely
    is_active = int(features.get("IsActiveMember", features.get("is_active_member", 1)))
    products = int(features.get("NumOfProducts", features.get("num_of_products", 1)))
    balance = float(features.get("Balance", features.get("balance", 0.0)))
    age = int(features.get("Age", features.get("age", 40)))
    geo = str(features.get("Geography", features.get("geography", "")))
    tenure = int(features.get("Tenure", features.get("tenure", 5)))
    credit_score = int(features.get("CreditScore", features.get("credit_score", 650)))
    
    # Check top driver feature names
    top_driver_features = [d.get("feature", "") for d in drivers[:3]]
    
    # 1. Product overload / misfit (3-4 products has ~80-100% churn)
    if products >= 3:
        rec = {
            "title": "Product-fit review & fee consolidation consultation",
            "priority": "Critical",
            "action_type": "product_review",
            "description": f"Customer holds {products} products. High product counts correlate with fee fatigue or complex account bundling. Schedule a product rationalization meeting."
        }
        recommendations.append(rec)
        seen_titles.add(rec["title"])
        
    # 2. Inactive account
    if is_active == 0:
        rec = {
            "title": "Re-engagement call & digital banking incentive",
            "priority": "High" if "IsActiveMember" in top_driver_features else "Medium",
            "action_type": "call",
            "description": "Customer is marked inactive. Initiate personalized relationship check-in and offer incentives for active mobile app / card transactions."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])
            
    # 3. High balance & mature age (wealth retention)
    if balance > 90000 and age >= 45:
        rec = {
            "title": "Dedicated wealth-advisor personal outreach",
            "priority": "High",
            "action_type": "meeting",
            "description": f"Significant capital at risk (balance: €{balance:,.2f}, age: {age}). Assign senior wealth manager to discuss customized yield opportunities."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])
            
    # 4. Germany geographical hotspot
    if geo.lower() == "germany" and ("Geography_Germany" in top_driver_features or "Geography" in top_driver_features or balance > 70000):
        rec = {
            "title": "Regional loyalty rewards & competitive rate match",
            "priority": "High" if balance > 100000 else "Medium",
            "action_type": "offer",
            "description": "German clients face strong local neo-bank competition. Offer German market preferential savings tier and fee waivers."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])
            
    # 5. Zero balance dormancy
    if balance == 0:
        rec = {
            "title": "Salary-credit direct deposit cashback incentive",
            "priority": "High",
            "action_type": "offer",
            "description": "Account currently holds zero balance. Enroll customer in a €50 welcome bonus for direct salary deposit activation."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])
            
    # 6. Single product vulnerability
    if products == 1 and tenure >= 2:
        rec = {
            "title": "Secondary product cross-sell (Savings / Credit Card)",
            "priority": "Medium",
            "action_type": "offer",
            "description": "Customer holds only 1 product. Cross-selling a second sticky product cuts churn probability significantly."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])
            
    # 7. Credit health check / Fee waiver
    if credit_score < 600:
        rec = {
            "title": "Credit health review and account fee waiver",
            "priority": "Low",
            "action_type": "fee_waiver",
            "description": "Customer has a lower credit score. Proactively review account maintenance charges and offer fee forgiveness to build goodwill."
        }
        if rec["title"] not in seen_titles:
            recommendations.append(rec)
            seen_titles.add(rec["title"])

    # Fallback if no specific condition met
    if not recommendations:
        recommendations.append({
            "title": "Quarterly relationship check-in call",
            "priority": "Low",
            "action_type": "call",
            "description": "Schedule routine touchpoint to assess client satisfaction and gather feedback."
        })
        
    return recommendations[:3]
