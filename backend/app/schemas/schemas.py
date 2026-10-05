from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field

# ================= AUTH SCHEMAS =================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RefreshRequest(BaseModel):
    refresh_token: str

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "rm"
    is_active: bool = True
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class UserResponse(UserBase):
    id: str
    last_login_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================= CUSTOMER SCHEMAS =================
class CustomerBase(BaseModel):
    credit_score: int = Field(..., ge=300, le=900)
    geography: str
    gender: str
    age: int = Field(..., ge=18, le=100)
    tenure: int = Field(..., ge=0, le=50)
    balance: float = Field(..., ge=0.0)
    num_of_products: int = Field(..., ge=1, le=6)
    has_cr_card: bool
    is_active_member: bool
    estimated_salary: float = Field(..., ge=0.0)

class CustomerCreate(CustomerBase):
    external_id: int
    surname: Optional[str] = None
    assigned_rm_id: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    external_id: Union[int, str]
    surname: Optional[str] = None
    actual_churned: Optional[bool] = None
    assigned_rm_id: Optional[str] = None
    assigned_rm_name: Optional[str] = None
    latest_probability: Optional[float] = None
    latest_risk_tier: Optional[str] = None
    latest_scored_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CustomerListResponse(BaseModel):
    items: List[CustomerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# ================= PREDICTION SCHEMAS =================
class PredictRequest(CustomerBase):
    customer_id: Optional[str] = None

class DriverResponse(BaseModel):
    rank: int
    feature: str
    friendly_name: str
    feature_value: Optional[str] = None
    shap_value: float
    direction: str  # increases | decreases
    reason_text: str

class RecommendationResponse(BaseModel):
    title: str
    priority: str  # Critical, High, Medium, Low
    action_type: str
    description: str

class PredictResponse(BaseModel):
    probability: float
    risk_tier: str
    predicted_churn: bool
    threshold: float
    model_version: str
    drivers: List[DriverResponse] = []
    recommendations: List[RecommendationResponse] = []
    latency_ms: Optional[int] = None
    revenue_at_risk: Optional[float] = None

class WhatIfRequest(BaseModel):
    customer_id: Optional[str] = None
    base_features: CustomerBase
    modified_features: CustomerBase

class WhatIfResponse(BaseModel):
    baseline_probability: float
    baseline_risk_tier: str
    scenario_probability: float
    scenario_risk_tier: str
    delta_probability: float
    delta_points: float
    drivers: List[DriverResponse] = []
    recommendations: List[RecommendationResponse] = []

class BatchJobResponse(BaseModel):
    id: str
    file_name: str
    status: str
    total_rows: int
    processed_rows: int
    failed_rows: int
    error_report: Optional[Dict[str, Any]] = None
    result_path: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

# ================= ACTION SCHEMAS =================
class ActionCreate(BaseModel):
    customer_id: str
    type: str  # call, email, offer, fee_waiver, meeting, product_review, other
    title: str
    notes: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None

class ActionUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # todo, in_progress, done, cancelled
    outcome: Optional[str] = None  # pending, retained, churned
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None

class ActionStatusUpdate(BaseModel):
    status: str
    outcome: Optional[str] = None
    notes: Optional[str] = None

class ActionResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    created_by: str
    creator_name: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    type: str
    title: str
    notes: Optional[str] = None
    status: str
    outcome: str
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ================= CAMPAIGN SCHEMAS =================
class SegmentRule(BaseModel):
    field: str
    op: str  # eq, neq, gt, lt, gte, lte, in
    value: Any

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    segment_rules: List[SegmentRule]
    offer: Optional[str] = None
    control_pct: int = 10
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    status: str
    segment_rules: List[Dict[str, Any]]
    offer: Optional[str] = None
    control_pct: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    audience_size: int
    projected_revenue_at_risk: float
    created_at: datetime

    class Config:
        from_attributes = True

class SegmentPreviewRequest(BaseModel):
    segment_rules: List[SegmentRule]

class SegmentPreviewResponse(BaseModel):
    audience_size: int
    projected_revenue_at_risk: float
    sample_customers: List[CustomerResponse] = []

# ================= DASHBOARD & MONITORING =================
class KpiSummary(BaseModel):
    total_customers: int
    churn_rate: float
    at_risk_count: int
    at_risk_rate: float
    revenue_at_risk: float
    avg_customer_balance: float
    total_portfolio_balance: float
    active_member_pct: float
    deltas: Dict[str, Any]

class TrendPoint(BaseModel):
    month: str
    churn_rate: float
    retained_rate: float
    total_customers: int
    revenue_at_risk: float

class SegmentBreakdownItem(BaseModel):
    segment: str
    category: str
    total: int
    churn_count: int
    churn_rate: float
    avg_probability: float

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
