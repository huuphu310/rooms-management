from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from decimal import Decimal
from enum import Enum
from uuid import UUID


class ReportPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class ReportCategory(str, Enum):
    OPERATIONAL = "operational"
    FINANCIAL = "financial"
    GUEST = "guest"
    PERFORMANCE = "performance"
    INVENTORY = "inventory"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class ReportType(str, Enum):
    STANDARD = "standard"
    CUSTOM = "custom"
    DASHBOARD = "dashboard"
    SCHEDULED = "scheduled"


class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ReportDefinition(BaseModel):
    id: UUID
    report_code: str
    report_name: str
    report_category: ReportCategory
    report_type: ReportType
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    display_config: Optional[Dict[str, Any]] = None
    required_permission: Optional[str] = None
    visibility: str = "public"
    is_active: bool = True
    is_system: bool = False
    created_at: datetime
    updated_at: datetime


class ReportSchedule(BaseModel):
    id: UUID
    report_id: UUID
    schedule_name: str
    frequency: ReportPeriod
    schedule_config: Dict[str, Any]
    default_parameters: Optional[Dict[str, Any]] = None
    recipients: Dict[str, Any]
    delivery_format: ReportFormat
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    error_message: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class ReportExecution(BaseModel):
    id: UUID
    report_id: UUID
    schedule_id: Optional[UUID] = None
    executed_by: str
    execution_type: str
    parameters: Dict[str, Any]
    row_count: Optional[int] = None
    execution_time_ms: Optional[int] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    executed_at: datetime
    completed_at: Optional[datetime] = None


class KPIDefinition(BaseModel):
    id: UUID
    kpi_code: str
    kpi_name: str
    category: Optional[str] = None
    calculation_sql: Optional[str] = None
    unit: str
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    display_format: Optional[str] = None
    trend_direction: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class KPIValue(BaseModel):
    id: UUID
    kpi_id: UUID
    value: float
    period_date: date
    period_type: str
    previous_value: Optional[float] = None
    change_percentage: Optional[float] = None
    status: Optional[str] = None
    calculated_at: datetime


class OccupancySummary(BaseModel):
    total_rooms: int
    occupied_rooms: int
    occupancy_rate: float
    arrivals_today: int
    departures_today: int
    in_house_guests: Optional[int] = None


class RevenueSummary(BaseModel):
    room_revenue: Decimal
    pos_revenue: Decimal
    other_revenue: Optional[Decimal] = None
    total_revenue: Decimal
    adr: Decimal
    rev_par: Decimal


class OperationsSummary(BaseModel):
    check_ins_completed: int
    check_outs_completed: int
    pending_arrivals: int
    pending_departures: int
    rooms_to_clean: int
    maintenance_issues: int


class DailyOperationsReport(BaseModel):
    report_date: date
    summary: Dict[str, Any]
    detailed_sections: Dict[str, Any]


class RevenueReport(BaseModel):
    summary: Dict[str, Any]
    revenue_breakdown: Dict[str, Any]
    daily_trend: Optional[List[Dict[str, Any]]] = None
    top_performers: Optional[Dict[str, Any]] = None
    year_over_year: Optional[Dict[str, Any]] = None


class ProfitLossReport(BaseModel):
    period: str
    revenue: Dict[str, Any]
    expenses: Dict[str, Any]
    profitability: Dict[str, Any]
    ratios: Dict[str, Any]
    comparison: Optional[Dict[str, Any]] = None


class GuestDemographicsReport(BaseModel):
    period: str
    total_guests: int
    demographics: Dict[str, Any]
    behavior_patterns: Dict[str, Any]
    preferences: Dict[str, Any]


class KPIDashboard(BaseModel):
    timestamp: datetime
    kpis: Dict[str, Any]
    alerts: List[Dict[str, Any]]
    period_comparison: Dict[str, Any]


class SavedFilter(BaseModel):
    id: UUID
    report_id: UUID
    user_id: UUID
    filter_name: str
    filter_config: Dict[str, Any]
    is_default: bool = False
    created_at: datetime


class ReportSubscription(BaseModel):
    id: UUID
    user_id: UUID
    report_id: UUID
    frequency: Optional[ReportPeriod] = None
    delivery_method: str
    format: ReportFormat
    custom_filters: Optional[Dict[str, Any]] = None
    is_active: bool = True
    subscribed_at: datetime


class ExecuteReportRequest(BaseModel):
    report_id: UUID
    parameters: Dict[str, Any]
    format: Optional[ReportFormat] = ReportFormat.JSON
    include_charts: Optional[bool] = False


class ExecuteReportResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    file_url: Optional[str] = None
    error: Optional[str] = None
    execution_id: Optional[UUID] = None


class CreateScheduleRequest(BaseModel):
    report_id: UUID
    schedule_name: str
    frequency: ReportPeriod
    schedule_config: Dict[str, Any]
    default_parameters: Optional[Dict[str, Any]] = None
    recipients: Dict[str, Any]
    delivery_format: ReportFormat


class OccupancyReport(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    total_rooms: int
    total_available_room_nights: int
    total_occupied_room_nights: int
    occupancy_rate: float
    average_daily_rate: Decimal
    revenue_per_available_room: Decimal
    room_type_breakdown: List[Dict[str, Any]]
    daily_occupancy: List[Dict[str, Any]]


class RevenueReport(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    room_revenue: Decimal
    service_revenue: Decimal
    pos_revenue: Decimal
    other_revenue: Decimal
    total_revenue: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    payment_method_breakdown: Dict[str, Decimal]
    daily_revenue: List[Dict[str, Any]]
    top_revenue_sources: List[Dict[str, Any]]


class CustomerAnalytics(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    new_customers: int
    returning_customers: int
    total_customers: int
    average_stay_duration: float
    average_booking_value: Decimal
    customer_satisfaction_score: Optional[float]
    top_customers: List[Dict[str, Any]]
    customer_segments: Dict[str, int]
    nationality_breakdown: Dict[str, int]


class OperationalReport(BaseModel):
    date: date
    check_ins_today: int
    check_outs_today: int
    arrivals_tomorrow: int
    departures_tomorrow: int
    rooms_occupied: int
    rooms_available: int
    rooms_under_maintenance: int
    housekeeping_status: Dict[str, int]
    pending_payments: Decimal
    tasks_pending: int
    low_stock_items: int


class FinancialSummary(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    gross_revenue: Decimal
    net_revenue: Decimal
    total_expenses: Decimal
    gross_profit: Decimal
    net_profit: Decimal
    profit_margin: float
    accounts_receivable: Decimal
    accounts_payable: Decimal
    cash_flow: Decimal
    expense_breakdown: Dict[str, Decimal]


class PerformanceMetrics(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    occupancy_rate: float
    adr: Decimal  # Average Daily Rate
    revpar: Decimal  # Revenue Per Available Room
    goppar: Decimal  # Gross Operating Profit Per Available Room
    average_los: float  # Length of Stay
    booking_lead_time: float
    cancellation_rate: float
    no_show_rate: float
    repeat_guest_ratio: float
    online_booking_ratio: float


class ForecastReport(BaseModel):
    period: ReportPeriod
    forecast_date: date
    projected_occupancy: float
    projected_revenue: Decimal
    projected_arrivals: int
    projected_departures: int
    room_availability: Dict[str, int]
    demand_forecast: List[Dict[str, Any]]
    revenue_forecast: List[Dict[str, Any]]
    recommendations: List[str]


class ComparisonReport(BaseModel):
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    year_over_year: Dict[str, Any]
    variance_analysis: Dict[str, Any]
    growth_metrics: Dict[str, float]
    trends: List[Dict[str, Any]]