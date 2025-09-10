import { api } from '../api';
import type {
  ReportDefinition,
  ReportSchedule,
  ReportExecution,
  DailyOperationsReport,
  RevenueReport,
  ProfitLossReport,
  GuestDemographicsReport,
  KPIDashboard,
  SavedFilter,
  ReportSubscription,
  ExecuteReportRequest,
  ExecuteReportResponse,
  CreateScheduleRequest,
  ReportFormat
} from '@/types/reports';

export const reportsApi = {
  // ================================
  // OPERATIONAL REPORTS
  // ================================

  /**
   * Get daily operations report
   */
  async getDailyOperationsReport(date?: string): Promise<DailyOperationsReport> {
    const params = date ? `?report_date=${date}` : '';
    const response = await api.get(`/reports/daily-operations${params}`);
    return response.data;
  },

  /**
   * Get occupancy analysis report
   */
  async getOccupancyAnalysis(startDate: string, endDate: string, groupBy: string = 'day') {
    const response = await api.get('/reports/occupancy-analysis', {
      params: { start_date: startDate, end_date: endDate, group_by: groupBy }
    });
    return response.data;
  },

  /**
   * Get housekeeping report
   */
  async getHousekeepingReport(date?: string) {
    const params = date ? `?report_date=${date}` : '';
    const response = await api.get(`/reports/housekeeping${params}`);
    return response.data;
  },

  // ================================
  // FINANCIAL REPORTS
  // ================================

  /**
   * Get revenue report
   */
  async getRevenueReport(startDate: string, endDate: string, period: string = 'daily'): Promise<RevenueReport> {
    const response = await api.get('/reports/revenue', {
      params: { start_date: startDate, end_date: endDate, period }
    });
    return response.data;
  },

  /**
   * Get profit & loss statement
   */
  async getProfitLossStatement(period: string): Promise<ProfitLossReport> {
    const response = await api.get('/reports/profit-loss', {
      params: { period }
    });
    return response.data;
  },

  /**
   * Get accounts receivable report
   */
  async getAccountsReceivable(asOfDate?: string) {
    const params = asOfDate ? `?as_of_date=${asOfDate}` : '';
    const response = await api.get(`/reports/accounts-receivable${params}`);
    return response.data;
  },

  // ================================
  // GUEST ANALYTICS REPORTS
  // ================================

  /**
   * Get guest demographics report
   */
  async getGuestDemographics(period: string): Promise<GuestDemographicsReport> {
    const response = await api.get('/reports/guest-demographics', {
      params: { period }
    });
    return response.data;
  },

  /**
   * Get guest satisfaction report
   */
  async getGuestSatisfaction(period: string) {
    const response = await api.get('/reports/guest-satisfaction', {
      params: { period }
    });
    return response.data;
  },

  // ================================
  // PERFORMANCE REPORTS
  // ================================

  /**
   * Get staff performance report
   */
  async getStaffPerformance(period: string, department: string = 'all') {
    const response = await api.get('/reports/staff-performance', {
      params: { period, department }
    });
    return response.data;
  },

  /**
   * Get KPI dashboard
   */
  async getKPIDashboard(): Promise<KPIDashboard> {
    const response = await api.get('/reports/kpi-dashboard');
    return response.data;
  },

  // ================================
  // INVENTORY REPORTS
  // ================================

  /**
   * Get inventory stock report
   */
  async getInventoryStock(asOf?: string, category?: string) {
    const response = await api.get('/reports/inventory-stock', {
      params: { as_of: asOf, category }
    });
    return response.data;
  },

  /**
   * Get purchase analysis report
   */
  async getPurchaseAnalysis(period: string) {
    const response = await api.get('/reports/purchase-analysis', {
      params: { period }
    });
    return response.data;
  },

  // ================================
  // COMPLIANCE REPORTS
  // ================================

  /**
   * Get tax summary report
   */
  async getTaxSummary(period: string) {
    const response = await api.get('/reports/tax-summary', {
      params: { period }
    });
    return response.data;
  },

  /**
   * Get audit trail report
   */
  async getAuditTrail(startDate: string, endDate: string, modules?: string[]) {
    const response = await api.get('/reports/audit-trail', {
      params: { start_date: startDate, end_date: endDate, module: modules }
    });
    return response.data;
  },

  // ================================
  // REPORT MANAGEMENT
  // ================================

  /**
   * List available report definitions
   */
  async listReportDefinitions(category?: string): Promise<ReportDefinition[]> {
    const params = category ? `?category=${category}` : '';
    const response = await api.get(`/reports/definitions${params}`);
    return response.data;
  },

  /**
   * Execute a report
   */
  async executeReport(request: ExecuteReportRequest): Promise<ExecuteReportResponse> {
    const response = await api.post(`/reports/execute/${request.report_id}`, {
      parameters: request.parameters,
      format: request.format || 'json',
      include_charts: request.include_charts
    });
    return response.data;
  },

  /**
   * Download report in specified format
   */
  async downloadReport(reportId: string, parameters: Record<string, any>, format: ReportFormat): Promise<Blob> {
    const response = await api.post(
      `/reports/execute/${reportId}`,
      { parameters },
      {
        params: { format },
        responseType: 'blob'
      }
    );
    return response.data;
  },

  /**
   * Get report execution history
   */
  async getExecutionHistory(reportId?: string, limit: number = 50): Promise<ReportExecution[]> {
    const params = new URLSearchParams();
    if (reportId) params.append('report_id', reportId);
    params.append('limit', limit.toString());
    
    const response = await api.get(`/reports/executions?${params}`);
    return response.data;
  },

  // ================================
  // REPORT SCHEDULING
  // ================================

  /**
   * Create report schedule
   */
  async createSchedule(schedule: CreateScheduleRequest): Promise<ReportSchedule> {
    const response = await api.post('/reports/schedules', schedule);
    return response.data;
  },

  /**
   * List report schedules
   */
  async listSchedules(reportId?: string, isActive?: boolean): Promise<ReportSchedule[]> {
    const params = new URLSearchParams();
    if (reportId) params.append('report_id', reportId);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    
    const response = await api.get(`/reports/schedules?${params}`);
    return response.data;
  },

  /**
   * Toggle schedule active status
   */
  async toggleSchedule(scheduleId: string): Promise<{ is_active: boolean }> {
    const response = await api.put(`/reports/schedules/${scheduleId}/toggle`);
    return response.data;
  },

  /**
   * Delete report schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await api.delete(`/reports/schedules/${scheduleId}`);
  },

  // ================================
  // SAVED FILTERS & SUBSCRIPTIONS
  // ================================

  /**
   * Save report filter
   */
  async saveFilter(reportId: string, filterName: string, filterConfig: Record<string, any>, isDefault: boolean = false): Promise<SavedFilter> {
    const response = await api.post('/reports/saved-filters', {
      report_id: reportId,
      filter_name: filterName,
      filter_config: filterConfig,
      is_default: isDefault
    });
    return response.data;
  },

  /**
   * Get saved filters for a report
   */
  async getSavedFilters(reportId: string): Promise<SavedFilter[]> {
    const response = await api.get(`/reports/saved-filters/${reportId}`);
    return response.data;
  },

  /**
   * Delete saved filter
   */
  async deleteSavedFilter(filterId: string): Promise<void> {
    await api.delete(`/reports/saved-filters/${filterId}`);
  },

  /**
   * Create report subscription
   */
  async createSubscription(subscription: Omit<ReportSubscription, 'id' | 'user_id' | 'subscribed_at'>): Promise<ReportSubscription> {
    const response = await api.post('/reports/subscriptions', subscription);
    return response.data;
  },

  /**
   * List user subscriptions
   */
  async listSubscriptions(): Promise<ReportSubscription[]> {
    const response = await api.get('/reports/subscriptions');
    return response.data;
  },

  /**
   * Delete subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await api.delete(`/reports/subscriptions/${subscriptionId}`);
  },

  // ================================
  // UTILITY FUNCTIONS
  // ================================

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  },

  /**
   * Format percentage value
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date range
   */
  formatDateRange(startDate: string | Date, endDate: string | Date): string {
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  },

  /**
   * Get report category color
   */
  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      operational: 'blue',
      financial: 'green',
      guest: 'purple',
      performance: 'orange',
      inventory: 'cyan',
      compliance: 'red',
      custom: 'gray'
    };
    return colors[category] || 'gray';
  },

  /**
   * Get report category icon
   */
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      operational: 'Settings',
      financial: 'DollarSign',
      guest: 'Users',
      performance: 'TrendingUp',
      inventory: 'Package',
      compliance: 'Shield',
      custom: 'FileText'
    };
    return icons[category] || 'FileText';
  }
};

export default reportsApi;