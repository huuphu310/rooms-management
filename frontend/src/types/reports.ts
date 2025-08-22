// Report Module Types

export type ReportCategory = 'operational' | 'financial' | 'guest' | 'performance' | 'inventory' | 'compliance' | 'custom';
export type ReportType = 'standard' | 'custom' | 'dashboard' | 'scheduled';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Report Definition
export interface ReportDefinition {
  id: string;
  report_code: string;
  report_name: string;
  report_category: ReportCategory;
  report_type: ReportType;
  description?: string;
  parameters?: ReportParameters;
  display_config?: DisplayConfig;
  required_permission?: string;
  visibility: 'public' | 'private' | 'department' | 'role';
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportParameters {
  [key: string]: {
    type: 'date' | 'daterange' | 'select' | 'multiselect' | 'text' | 'number' | 'month';
    required: boolean;
    default?: any;
    options?: string[];
  };
}

export interface DisplayConfig {
  charts?: string[];
  tables?: boolean;
  summary_cards?: boolean;
  export_formats?: ReportFormat[];
  real_time?: boolean;
  refresh_interval?: number;
}

// Report Schedule
export interface ReportSchedule {
  id: string;
  report_id: string;
  schedule_name: string;
  frequency: ReportFrequency;
  schedule_config: ScheduleConfig;
  default_parameters?: Record<string, any>;
  recipients: Recipients;
  delivery_format: ReportFormat;
  last_run_at?: string;
  next_run_at?: string;
  last_status?: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleConfig {
  time?: string;
  day_of_week?: number;
  day_of_month?: number;
  cron_expression?: string;
}

export interface Recipients {
  emails?: string[];
  roles?: string[];
  slack_channels?: string[];
}

// Report Execution
export interface ReportExecution {
  id: string;
  report_id: string;
  schedule_id?: string;
  executed_by: string;
  execution_type: 'manual' | 'scheduled' | 'api';
  parameters: Record<string, any>;
  row_count?: number;
  execution_time_ms?: number;
  file_url?: string;
  file_size?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  executed_at: string;
  completed_at?: string;
}

// KPI Definition
export interface KPIDefinition {
  id: string;
  kpi_code: string;
  kpi_name: string;
  category?: string;
  calculation_sql?: string;
  unit: 'percentage' | 'currency' | 'number' | 'ratio';
  target_value?: number;
  warning_threshold?: number;
  critical_threshold?: number;
  display_format?: string;
  trend_direction?: 'higher_better' | 'lower_better' | 'neutral';
  is_active: boolean;
  created_at: string;
}

export interface KPIValue {
  id: string;
  kpi_id: string;
  value: number;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  previous_value?: number;
  change_percentage?: number;
  status?: 'good' | 'warning' | 'critical';
  calculated_at: string;
}

// Report Data Structures

// Daily Operations Report
export interface DailyOperationsReport {
  report_date: string;
  summary: {
    occupancy: OccupancySummary;
    revenue: RevenueSummary;
    operations: OperationsSummary;
  };
  detailed_sections: {
    arrivals: ArrivalData[];
    departures: DepartureData[];
    housekeeping_status: HousekeepingStatus;
    alerts: OperationalAlert[];
  };
}

export interface OccupancySummary {
  total_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  arrivals_today: number;
  departures_today: number;
  in_house_guests?: number;
}

export interface RevenueSummary {
  room_revenue: number;
  pos_revenue: number;
  other_revenue?: number;
  total_revenue: number;
  adr: number;
  rev_par: number;
}

export interface OperationsSummary {
  check_ins_completed: number;
  check_outs_completed: number;
  pending_arrivals: number;
  pending_departures: number;
  rooms_to_clean: number;
  maintenance_issues: number;
}

export interface ArrivalData {
  booking_code: string;
  guest_name: string;
  room: string;
  check_in_time: string;
  nights: number;
  status: string;
  special_requests?: string;
}

export interface DepartureData {
  booking_code: string;
  guest_name: string;
  room: string;
  check_out_time: string;
  balance_due?: number;
}

export interface HousekeepingStatus {
  clean: number;
  dirty: number;
  inspected: number;
  out_of_order: number;
}

export interface OperationalAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
}

// Revenue Report
export interface RevenueReport {
  summary: {
    total_revenue: number;
    room_revenue: number;
    fnb_revenue: number;
    other_revenue: number;
    growth_rate: number;
    vs_last_period: string;
  };
  revenue_breakdown: {
    by_source: Record<string, number>;
    by_room_type: Record<string, number>;
    by_payment_method: Record<string, number>;
  };
  daily_trend?: TrendData[];
  top_performers?: {
    best_room_type: string;
    best_day: string;
    highest_adr_day: string;
  };
  year_over_year?: {
    current_year: number;
    last_year: number;
    growth: number;
    growth_percentage: number;
  };
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// Profit & Loss Report
export interface ProfitLossReport {
  period: string;
  revenue: {
    room_revenue: number;
    food_beverage: number;
    other_operating: number;
    total_revenue: number;
  };
  expenses: {
    operating_expenses: Record<string, number>;
    non_operating_expenses: Record<string, number>;
    total_expenses: number;
  };
  profitability: {
    gross_profit: number;
    operating_profit: number;
    net_profit: number;
    profit_margin: number;
    ebitda: number;
  };
  ratios: {
    expense_ratio: number;
    labor_cost_ratio: number;
    gop_margin: number;
  };
  comparison?: {
    vs_last_month: string;
    vs_last_year: string;
    vs_budget: string;
  };
}

// Guest Demographics Report
export interface GuestDemographicsReport {
  period: string;
  total_guests: number;
  demographics: {
    by_nationality: Record<string, number>;
    by_age_group: Record<string, number>;
    by_gender: Record<string, number>;
    by_purpose: Record<string, number>;
  };
  behavior_patterns: {
    average_length_of_stay: number;
    booking_lead_time: number;
    repeat_guest_rate: number;
    direct_booking_rate: number;
  };
  preferences: {
    room_type: Record<string, number>;
    payment_method: Record<string, number>;
  };
}

// KPI Dashboard
export interface KPIDashboard {
  timestamp: string;
  kpis: Record<string, KPIData>;
  alerts: KPIAlert[];
  period_comparison: {
    vs_yesterday?: string;
    vs_last_week?: string;
    vs_last_month?: string;
    vs_last_year?: string;
  };
}

export interface KPIData {
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical' | 'excellent';
}

export interface KPIAlert {
  kpi: string;
  message: string;
  severity: AlertSeverity;
}

// Report Filters
export interface SavedFilter {
  id: string;
  report_id: string;
  user_id: string;
  filter_name: string;
  filter_config: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

// Report Subscription
export interface ReportSubscription {
  id: string;
  user_id: string;
  report_id: string;
  frequency?: ReportFrequency;
  delivery_method: 'email' | 'in_app' | 'slack';
  format: ReportFormat;
  custom_filters?: Record<string, any>;
  is_active: boolean;
  subscribed_at: string;
}

// Chart Configuration
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'radar';
  title?: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  series?: ChartSeries[];
  colors?: string[];
  legend?: boolean;
  tooltip?: boolean;
  responsive?: boolean;
}

export interface ChartSeries {
  name: string;
  data: number[];
  type?: string;
  color?: string;
}

// Export Options
export interface ExportOptions {
  format: ReportFormat;
  include_charts?: boolean;
  include_summary?: boolean;
  page_orientation?: 'portrait' | 'landscape';
  paper_size?: 'A4' | 'Letter' | 'Legal';
}

// Report Request/Response
export interface ExecuteReportRequest {
  report_id: string;
  parameters: Record<string, any>;
  format?: ReportFormat;
  include_charts?: boolean;
}

export interface ExecuteReportResponse {
  success: boolean;
  data?: any;
  file_url?: string;
  error?: string;
  execution_id?: string;
}

export interface CreateScheduleRequest {
  report_id: string;
  schedule_name: string;
  frequency: ReportFrequency;
  schedule_config: ScheduleConfig;
  default_parameters?: Record<string, any>;
  recipients: Recipients;
  delivery_format: ReportFormat;
}