import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    SmallInteger,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
    JSON,
    Index,
    Numeric
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="rm")  # admin, manager, rm, analyst
    is_active = Column(Boolean, nullable=False, default=True)
    avatar_url = Column(Text, nullable=True)
    preferences = Column(JSON, nullable=False, default=lambda: {"theme": "system"})
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    assigned_customers = relationship("Customer", back_populates="assigned_rm")
    created_actions = relationship("RetentionAction", back_populates="creator", foreign_keys="RetentionAction.created_by")
    assigned_actions = relationship("RetentionAction", back_populates="assignee", foreign_keys="RetentionAction.assignee_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    user = relationship("User", back_populates="refresh_tokens")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    external_id = Column(BigInteger, unique=True, nullable=False, index=True)
    surname = Column(String(120), nullable=True)  # PII masked for analyst
    credit_score = Column(SmallInteger, nullable=False)
    geography = Column(String(40), nullable=False, index=True)
    gender = Column(String(10), nullable=False)
    age = Column(SmallInteger, nullable=False)
    tenure = Column(SmallInteger, nullable=False)
    balance = Column(Float, nullable=False, default=0.0)
    num_of_products = Column(SmallInteger, nullable=False)
    has_cr_card = Column(Boolean, nullable=False)
    is_active_member = Column(Boolean, nullable=False)
    estimated_salary = Column(Float, nullable=False)
    actual_churned = Column(Boolean, nullable=True)
    assigned_rm_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    
    # Denormalized fields for quick list sorting
    latest_probability = Column(Float, nullable=True)
    latest_risk_tier = Column(String(20), nullable=True, index=True)  # low, medium, high, critical
    latest_scored_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    assigned_rm = relationship("User", back_populates="assigned_customers")
    predictions = relationship("Prediction", back_populates="customer", cascade="all, delete-orphan")
    snapshots = relationship("CustomerSnapshot", back_populates="customer", cascade="all, delete-orphan")
    actions = relationship("RetentionAction", back_populates="customer", cascade="all, delete-orphan")
    campaign_links = relationship("CampaignCustomer", back_populates="customer", cascade="all, delete-orphan")

class CustomerSnapshot(Base):
    __tablename__ = "customer_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False)
    features = Column(JSON, nullable=False)
    probability = Column(Float, nullable=True)

    customer = relationship("Customer", back_populates="snapshots")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    version = Column(String(20), unique=True, nullable=False)
    algorithm = Column(String(40), nullable=False)
    status = Column(String(20), nullable=False, default="staging")  # training, staging, active, archived, failed
    threshold = Column(Float, nullable=False, default=0.14)
    artifact_path = Column(Text, nullable=False)
    feature_list = Column(JSON, nullable=False)
    hyperparameters = Column(JSON, nullable=True)
    training_rows = Column(Integer, nullable=True)
    data_hash = Column(String(64), nullable=True)
    trained_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    trained_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    promoted_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    metrics = relationship("ModelMetric", back_populates="model", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="model")
    drift_reports = relationship("DriftReport", back_populates="model", cascade="all, delete-orphan")

class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    split = Column(String(10), nullable=False)  # train, val, test
    roc_auc = Column(Float, nullable=True)
    pr_auc = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1 = Column(Float, nullable=True)
    brier_score = Column(Float, nullable=True)
    ece = Column(Float, nullable=True)
    confusion = Column(JSON, nullable=True)
    roc_curve = Column(JSON, nullable=True)
    pr_curve = Column(JSON, nullable=True)
    calibration_curve = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    fairness = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    model = relationship("ModelVersion", back_populates="metrics")

class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="queued")  # queued, running, completed, failed
    total_rows = Column(Integer, nullable=True, default=0)
    processed_rows = Column(Integer, nullable=True, default=0)
    failed_rows = Column(Integer, nullable=True, default=0)
    error_report = Column(JSON, nullable=True)
    result_path = Column(Text, nullable=True)
    model_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(String(36), ForeignKey("model_versions.id"), nullable=False)
    batch_job_id = Column(String(36), ForeignKey("batch_jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    input_features = Column(JSON, nullable=False)
    probability = Column(Float, nullable=False)
    risk_tier = Column(String(20), nullable=False)  # low, medium, high, critical
    predicted_churn = Column(Boolean, nullable=False)
    is_whatif = Column(Boolean, nullable=False, default=False)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)

    customer = relationship("Customer", back_populates="predictions")
    model = relationship("ModelVersion", back_populates="predictions")
    drivers = relationship("PredictionDriver", back_populates="prediction", cascade="all, delete-orphan")

class PredictionDriver(Base):
    __tablename__ = "prediction_drivers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False, index=True)
    rank = Column(SmallInteger, nullable=False)
    feature = Column(String(60), nullable=False)
    feature_value = Column(String(60), nullable=True)
    shap_value = Column(Float, nullable=False)
    direction = Column(String(10), nullable=False)  # increases | decreases
    reason_text = Column(Text, nullable=False)

    prediction = relationship("Prediction", back_populates="drivers")

class RetentionAction(Base):
    __tablename__ = "retention_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    assignee_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    type = Column(String(30), nullable=False)  # call, email, offer, fee_waiver, meeting, product_review, other
    title = Column(String(160), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="todo")  # todo, in_progress, done, cancelled
    outcome = Column(String(20), nullable=False, default="pending")  # pending, retained, churned
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    customer = relationship("Customer", back_populates="actions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_actions")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_actions")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft, active, completed, archived
    segment_rules = Column(JSON, nullable=False)  # [{"field":"geography","op":"eq","value":"Germany"}, ...]
    offer = Column(String(255), nullable=True)
    control_pct = Column(SmallInteger, nullable=False, default=10)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    audience_size = Column(Integer, nullable=True, default=0)
    projected_revenue_at_risk = Column(Float, nullable=True, default=0.0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    customer_links = relationship("CampaignCustomer", back_populates="campaign", cascade="all, delete-orphan")

class CampaignCustomer(Base):
    __tablename__ = "campaign_customers"

    campaign_id = Column(String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True)
    is_control = Column(Boolean, nullable=False, default=False)
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    outcome = Column(String(20), nullable=False, default="pending")  # pending, retained, churned

    campaign = relationship("Campaign", back_populates="customer_links")
    customer = relationship("Customer", back_populates="campaign_links")

class DriftReport(Base):
    __tablename__ = "drift_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("model_versions.id"), nullable=False, index=True)
    report_date = Column(Date, nullable=False)
    feature = Column(String(60), nullable=False)
    psi = Column(Float, nullable=False)
    status = Column(String(10), nullable=False)  # ok, warn, alert

    model = relationship("ModelVersion", back_populates="drift_reports")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(30), nullable=False)  # high_risk, drift, task_due, batch_done
    title = Column(String(160), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(60), nullable=False)  # login, predict, export, role_change, retrain, etc.
    entity_type = Column(String(40), nullable=True)
    entity_id = Column(String(64), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(60), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
