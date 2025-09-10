import { api } from '../api'
import type {
  Invoice,
  Payment,
  PaymentSchedule,
  CreateDepositInvoice,
  CreatePartialInvoice,
  ProcessPayment,
  RecordDepositPayment,
  GenerateQRCode,
  QRCodeResponse,
  QRStatusResponse,
  CreatePaymentSchedule,
  ProcessRefund,
  BookingPaymentSummary,
  RevenueReport,
  BillingDashboard,
  InvoiceSearchParams,
  PaymentSearchParams,
  InvoiceUpdate,
  DepositRule,
  DepositRuleCreate
} from '@/types/billing-enhanced'

export const billingEnhancedApi = {
  // Invoice Management
  async createDepositInvoice(data: CreateDepositInvoice): Promise<Invoice> {
    const response = await api.post('/billing-enhanced/invoices/create-deposit', data)
    return response.data
  },

  async createPartialInvoice(data: CreatePartialInvoice): Promise<Invoice> {
    const response = await api.post('/billing-enhanced/invoices/create-partial', data)
    return response.data
  },

  async getInvoices(params?: InvoiceSearchParams): Promise<Invoice[]> {
    const response = await api.get('/billing-enhanced/invoices', { params })
    return response.data
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await api.get(`/billing-enhanced/invoices/${invoiceId}`)
    return response.data
  },

  async updateInvoice(invoiceId: string, data: InvoiceUpdate): Promise<Invoice> {
    const response = await api.put(`/billing-enhanced/invoices/${invoiceId}`, data)
    return response.data
  },

  // Payment Summary
  async getBookingPaymentSummary(bookingId: string): Promise<BookingPaymentSummary> {
    const response = await api.get(`/billing-enhanced/bookings/${bookingId}/payment-summary`)
    return response.data
  },

  // Payment Processing
  async processPayment(data: ProcessPayment): Promise<Payment[]> {
    const response = await api.post('/billing-enhanced/payments/process', data)
    return response.data
  },

  async recordDepositPayment(data: RecordDepositPayment): Promise<Payment> {
    const response = await api.post('/billing-enhanced/payments/record-deposit', data)
    return response.data
  },

  async recordPayment(data: any): Promise<Payment> {
    const response = await api.post('/billing-enhanced/payments/record', data)
    return response.data
  },

  async createDirectPayment(data: any): Promise<Payment> {
    const response = await api.post('/billing-enhanced/payments/record-direct', data)
    return response.data
  },

  async getPayments(params?: PaymentSearchParams): Promise<Payment[]> {
    const response = await api.get('/billing-enhanced/payments', { params })
    return response.data
  },

  // Placeholder methods for getting bookings and customers (if not already existing)
  async getBookings(): Promise<any[]> {
    const response = await api.get('/bookings')
    return response.data
  },

  async getCustomers(): Promise<any[]> {
    const response = await api.get('/customers')
    return response.data
  },

  // QR Code Payments
  async generateQRCode(data: GenerateQRCode): Promise<QRCodeResponse> {
    const response = await api.post('/billing-enhanced/payments/generate-qr', data)
    return response.data
  },

  async createQRPayment(data: GenerateQRCode): Promise<QRCodeResponse> {
    // Alias for generateQRCode for backward compatibility
    return this.generateQRCode(data)
  },

  async getQRPaymentStatus(qrPaymentId: string): Promise<QRStatusResponse> {
    const response = await api.get(`/billing-enhanced/payments/qr-status/${qrPaymentId}`)
    return response.data
  },

  async getQRCodes(params?: { page?: number; limit?: number; status?: string; invoice_code?: string }): Promise<any> {
    const response = await api.get('/payment-integration/qr-codes', { params })
    return response.data
  },

  // Payment Schedules
  async createPaymentSchedule(data: CreatePaymentSchedule): Promise<PaymentSchedule[]> {
    const response = await api.post('/billing-enhanced/payment-schedules/create', data)
    return response.data
  },

  async getPaymentSchedules(bookingId: string): Promise<PaymentSchedule[]> {
    if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
      console.warn('getPaymentSchedules called with invalid bookingId:', bookingId)
      return []
    }
    const response = await api.get(`/billing-enhanced/payment-schedules/${bookingId}`)
    return response.data
  },

  // Refunds
  async processRefund(paymentId: string, data: ProcessRefund): Promise<Payment> {
    const response = await api.post(`/billing-enhanced/payments/${paymentId}/refund`, data)
    return response.data
  },

  // Reports
  async getRevenueReport(dateFrom: string, dateTo: string): Promise<RevenueReport> {
    const response = await api.get('/billing-enhanced/reports/revenue', {
      params: { date_from: dateFrom, date_to: dateTo }
    })
    return response.data
  },

  async getBillingDashboard(): Promise<BillingDashboard> {
    const response = await api.get('/billing-enhanced/dashboard')
    return response.data
  },

  // Deposit Rules (Admin)
  async createDepositRule(data: DepositRuleCreate): Promise<DepositRule> {
    const response = await api.post('/billing-enhanced/deposit-rules', data)
    return response.data
  },

  async getDepositRules(): Promise<DepositRule[]> {
    const response = await api.get('/billing-enhanced/deposit-rules')
    return response.data
  },

  // Utility methods
  async downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    const response = await api.get(`/billing-enhanced/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  },

  async downloadReceiptPDF(paymentId: string): Promise<Blob> {
    const response = await api.get(`/billing-enhanced/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    })
    return response.data
  },

  async sendPaymentReminder(invoiceId: string): Promise<void> {
    await api.post(`/billing-enhanced/invoices/${invoiceId}/remind`)
  },

  async markInvoiceOverdue(invoiceId: string): Promise<void> {
    await api.post(`/billing-enhanced/invoices/${invoiceId}/mark-overdue`)
  },

  // Health check
  async healthCheck(): Promise<{ status: string; features: string[] }> {
    const response = await api.get('/billing-enhanced/health')
    return response.data
  }
}