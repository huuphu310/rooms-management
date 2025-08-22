export enum InvoiceType {
  DEPOSIT = 'deposit',
  PARTIAL = 'partial',
  FINAL = 'final',
  ADDITIONAL = 'additional'
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  E_WALLET = 'e_wallet',
  VOUCHER = 'voucher',
  DEPOSIT_DEDUCTION = 'deposit_deduction'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentCategory {
  DEPOSIT = 'deposit',
  PARTIAL = 'partial',
  FINAL = 'final',
  REFUND = 'refund'
}

export enum ItemType {
  ROOM = 'room',
  SERVICE = 'service',
  PRODUCT = 'product',
  FEE = 'fee',
  CUSTOM = 'custom'
}

export enum DepositCalculationType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  NIGHTS_BASED = 'nights_based'
}

export enum QRPaymentStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  OVERPAID = 'overpaid',
  UNDERPAID = 'underpaid',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum ScheduleStatus {
  SCHEDULED = 'scheduled',
  INVOICED = 'invoiced',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

// Base interfaces
export interface InvoiceItem {
  id: string
  invoice_id: string
  item_type: ItemType
  reference_id?: string
  description: string
  quantity: number
  unit?: string
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  service_date?: string
  notes?: string
  sort_order: number
  created_at: string
}

export interface InvoiceItemCreate {
  item_type: ItemType
  reference_id?: string
  description: string
  quantity: number
  unit?: string
  unit_price: number
  discount_percent?: number
  discount_amount?: number
  tax_rate?: number
  tax_amount?: number
  total_amount: number
  service_date?: string
  notes?: string
  sort_order?: number
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_type: InvoiceType
  booking_id: string
  customer_id?: string
  currency: string
  subtotal: number
  service_charge: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  discount_reason?: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: InvoiceStatus
  invoice_date: string
  due_date: string
  paid_date?: string
  notes?: string
  internal_notes?: string
  payment_terms?: string
  items: InvoiceItem[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  payment_code: string
  invoice_id?: string
  booking_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  payment_details?: Record<string, any>
  reference_number?: string
  payment_date: string
  payment_status: PaymentStatus
  payment_category: PaymentCategory
  is_deposit: boolean
  is_refund: boolean
  refund_reason?: string
  original_payment_id?: string
  notes?: string
  received_by?: string
  created_at: string
  updated_at: string
}

export interface PaymentSchedule {
  id: string
  booking_id: string
  schedule_number: number
  description: string
  amount: number
  due_date: string
  status: ScheduleStatus
  invoice_id?: string
  paid_date?: string
  reminder_sent: boolean
  reminder_sent_at?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Creation DTOs
export interface DepositCalculation {
  method: DepositCalculationType
  value?: number
  override_amount?: number
}

export interface CreateDepositInvoice {
  booking_id: string
  deposit_calculation: DepositCalculation
  due_date: string
  payment_terms?: string
  notes?: string
}

export interface PartialInvoiceItem {
  description: string
  amount: number
  item_type: ItemType
}

export interface CreatePartialInvoice {
  booking_id: string
  invoice_type: InvoiceType
  items: PartialInvoiceItem[]
  due_date: string
  notes?: string
}

export interface ProcessPaymentItem {
  amount: number
  payment_method: PaymentMethod
  payment_details?: Record<string, any>
}

export interface ProcessPayment {
  invoice_id: string
  booking_id: string
  payments: ProcessPaymentItem[]
  send_receipt: boolean
}

export interface RecordDepositPayment {
  booking_id: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string
  payment_details?: Record<string, any>
  notes?: string
}

// QR Payment interfaces
export interface QRPaymentInfo {
  bank: string
  account_number: string
  account_holder: string
  amount: number
  transfer_content: string
  qr_code_id: string
}

export interface QRCodeResponse {
  qr_payment_id: string
  qr_code_url: string
  qr_code_data: string
  payment_info: QRPaymentInfo
  expires_at: string
}

export interface GenerateQRCode {
  invoice_id: string
  booking_id: string
  amount: number
  expiry_minutes?: number
}

export interface QRStatusResponse {
  qr_payment_id: string
  status: QRPaymentStatus
  payment_details: {
    expected_amount: number
    received_amount?: number
    amount_difference?: number
    is_exact_match: boolean
  }
  transaction?: {
    bank_transaction_id: string
    sender_name: string
    payment_received_at: string
  }
  invoice_status: InvoiceStatus
}

// Payment Summary
export interface PaymentSummary {
  total_booking_amount: number
  total_invoiced: number
  total_paid: number
  total_pending: number
  total_remaining: number
  payment_progress_percentage: number
  is_fully_paid: boolean
}

export interface BookingInfo {
  id: string
  booking_code: string
  total_amount: number
  status: string
}

export interface BookingPaymentSummary {
  booking: BookingInfo
  payment_summary: PaymentSummary
  invoices: Invoice[]
  payments: Payment[]
  payment_schedule: PaymentSchedule[]
}

// Payment Schedules
export interface ScheduleConfig {
  deposit_percentage: number
  installments: number
  final_payment_on_checkout: boolean
}

export interface CustomScheduleItem {
  description: string
  percentage: number
  days_from_booking?: number
  days_before_checkin?: number
  on_checkout: boolean
}

export interface CreatePaymentSchedule {
  booking_id: string
  auto_generate: boolean
  schedule_config?: ScheduleConfig
  custom_schedule?: CustomScheduleItem[]
}

// Refunds
export interface RefundApproval {
  approved_by: string
  approval_code: string
}

export interface ProcessRefund {
  refund_amount: number
  refund_reason: string
  refund_method: string
  approval?: RefundApproval
}

// Reports
export interface RevenueSummary {
  total_invoiced: number
  total_collected: number
  total_pending: number
  total_overdue: number
  collection_rate: number
}

export interface RevenueByMethod {
  cash: number
  bank_transfer: number
  credit_card: number
  e_wallet: number
  other: number
}

export interface RevenueByType {
  deposit: number
  partial: number
  final: number
  additional: number
}

export interface OutstandingBooking {
  booking_code: string
  customer_name: string
  total_amount: number
  paid_amount: number
  balance_due: number
  days_overdue: number
}

export interface RevenueReport {
  period: {
    from: string
    to: string
  }
  summary: RevenueSummary
  by_payment_method: RevenueByMethod
  by_invoice_type: RevenueByType
  outstanding_bookings: OutstandingBooking[]
}

// Dashboard
export interface TodaySummary {
  total_collected: number
  pending_payments: number
  overdue_amount: number
  invoices_generated: number
}

export interface PaymentTrend {
  last_7_days: Array<{ date: string; amount: number }>
  last_30_days: Array<{ date: string; amount: number }>
}

export interface TopPending {
  booking: string
  amount: number
  days_overdue: number
}

export interface BillingDashboard {
  today_summary: TodaySummary
  payment_trend: PaymentTrend
  top_pending: TopPending[]
}

// Search Parameters
export interface InvoiceSearchParams {
  booking_id?: string
  customer_id?: string
  invoice_type?: InvoiceType
  status?: InvoiceStatus
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface PaymentSearchParams {
  booking_id?: string
  invoice_id?: string
  payment_method?: PaymentMethod
  payment_category?: PaymentCategory
  status?: PaymentStatus
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

// Deposit Rules
export interface DepositRule {
  id: string
  name: string
  room_type_id?: string
  calculation_type: DepositCalculationType
  percentage_value?: number
  fixed_amount?: number
  nights_count?: number
  min_stay_nights?: number
  max_stay_nights?: number
  booking_window_days?: number
  priority: number
  is_active: boolean
  valid_from?: string
  valid_to?: string
  created_at: string
  updated_at: string
}

export interface DepositRuleCreate {
  name: string
  room_type_id?: string
  calculation_type: DepositCalculationType
  percentage_value?: number
  fixed_amount?: number
  nights_count?: number
  min_stay_nights?: number
  max_stay_nights?: number
  booking_window_days?: number
  priority?: number
  is_active?: boolean
  valid_from?: string
  valid_to?: string
}

// Update interfaces
export interface InvoiceUpdate {
  invoice_type?: InvoiceType
  due_date?: string
  discount_amount?: number
  discount_reason?: string
  notes?: string
  internal_notes?: string
  payment_terms?: string
}

export interface PaymentUpdate {
  payment_status?: PaymentStatus
  reference_number?: string
  notes?: string
}

export interface PaymentScheduleUpdate {
  description?: string
  amount?: number
  due_date?: string
  notes?: string
}