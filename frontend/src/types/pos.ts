// POS System Types

// Enums
export enum TransactionType {
  IMMEDIATE = "immediate",
  ROOM_CHARGE = "room_charge",
  TEMP_BILL = "temp_bill"
}

export enum CustomerType {
  WALK_IN = "walk_in",
  GUEST = "guest",
  STAFF = "staff",
  EXTERNAL = "external"
}

export enum PaymentStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  COMPLETED = "completed",
  VOID = "void"
}

export enum PaymentMethod {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  CREDIT_CARD = "credit_card",
  ROOM_CHARGE = "room_charge",
  QR_CODE = "qr_code"
}

export enum TransactionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  VOID = "void",
  REFUNDED = "refunded"
}

export enum ShiftStatus {
  OPEN = "open",
  CLOSED = "closed",
  SUSPENDED = "suspended",
  RECONCILED = "reconciled"
}

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
  VOUCHER = "voucher"
}

// Product & Category Types
export interface POSCategory {
  id: string;
  category_name: string;
  parent_id?: string;
  display_order: number;
  icon?: string;
  color?: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductModifier {
  id: string;
  product_id: string;
  modifier_group: string;
  modifier_name: string;
  price_adjustment: number;
  is_default: boolean;
  is_required: boolean;
  sort_order: number;
}

export interface QuickProduct {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  image_url?: string;
  modifiers: ProductModifier[];
  is_available: boolean;
  stock_quantity?: number;
}

// Transaction Types
export interface TransactionItem {
  id?: string;
  transaction_id?: string;
  product_id?: string;
  product_code?: string;
  product_name: string;
  category?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  modifiers?: any;
  sort_order: number;
}

export interface Transaction {
  id: string;
  transaction_code: string;
  transaction_type: TransactionType;
  shift_id?: string;
  terminal_id?: string;
  cashier_id: string;
  customer_type: CustomerType;
  booking_id?: string;
  customer_name?: string;
  customer_phone?: string;
  room_number?: string;
  subtotal: number;
  discount_amount: number;
  discount_type?: DiscountType;
  discount_reason?: string;
  tax_rate: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  qr_code_id?: string;
  qr_code_url?: string;
  qr_generated_at?: string;
  qr_paid_at?: string;
  receipt_number?: string;
  receipt_printed: boolean;
  receipt_printed_at?: string;
  receipt_print_count: number;
  status: TransactionStatus;
  void_reason?: string;
  void_by?: string;
  void_at?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  items: TransactionItem[];
}

// Payment Types
export interface Payment {
  id: string;
  transaction_id: string;
  payment_code: string;
  payment_method: PaymentMethod;
  amount: number;
  payment_details?: any;
  qr_payment_id?: string;
  bank_transaction_id?: string;
  status: string;
  processed_by?: string;
  processed_at: string;
  notes?: string;
  created_at: string;
}

export interface QRPaymentInit {
  status: string;
  transaction_id: string;
  qr_code_id: string;
  qr_code_url: string;
  amount: number;
  monitor_endpoint: string;
  expires_at: string;
}

export interface PaymentStatusCheck {
  transaction_id: string;
  payment_status: PaymentStatus;
  payment_received?: {
    amount: number;
    received_at: string;
    bank_reference: string;
  };
  action?: string;
}

// Shift Types
export interface Shift {
  id: string;
  shift_code: string;
  terminal_id?: string;
  shift_date: string;
  opened_at: string;
  closed_at?: string;
  opened_by: string;
  closed_by?: string;
  opening_cash: number;
  opening_notes?: string;
  expected_cash?: number;
  actual_cash?: number;
  cash_difference?: number;
  total_sales: number;
  total_refunds: number;
  total_discounts: number;
  total_tax: number;
  net_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  room_charge_sales: number;
  transaction_count: number;
  void_count: number;
  refund_count: number;
  status: ShiftStatus;
  closing_notes?: string;
  discrepancy_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftSummary {
  shift_code: string;
  duration: string;
  total_transactions: number;
  sales_summary: {
    gross_sales: number;
    discounts: number;
    refunds: number;
    net_sales: number;
  };
  payment_breakdown: {
    [key: string]: {
      amount: number;
      count: number;
      percentage: number;
    };
  };
  cash_reconciliation: {
    opening_cash: number;
    cash_sales: number;
    cash_refunds: number;
    expected_cash: number;
    actual_cash: number;
    difference: number;
    status: string;
  };
  top_items: Array<{
    product: string;
    quantity: number;
    revenue: number;
  }>;
}

// Receipt Types
export interface ReceiptTemplate {
  id: string;
  template_name: string;
  template_type: string;
  header_template: string;
  body_template?: string;
  footer_template: string;
  formatting?: any;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  transaction_id: string;
  receipt_number: string;
  receipt_type: string;
  formatted_receipt: string;
  printer_status: string;
  printed_at: string;
}

// Report Types
export interface DailySummary {
  date: string;
  summary: {
    total_revenue: number;
    transaction_count: number;
    average_transaction: number;
  };
  by_hour: Array<{
    hour: string;
    sales: number;
    transactions: number;
  }>;
  by_category: { [key: string]: number };
  by_payment: { [key: string]: number };
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  shift_details: Array<{
    shift: string;
    cashier: string;
    sales: number;
    status: string;
  }>;
}

// Request Types
export interface CreateTransactionRequest {
  customer_type: CustomerType;
  booking_id?: string;
  room_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    modifiers?: any[];
    notes?: string;
  }>;
  discount?: {
    type: DiscountType;
    value: number;
    reason?: string;
  };
  service_charge?: number;
}

export interface ProcessPaymentRequest {
  payment_method: PaymentMethod;
  amount?: number;
  customer_info?: {
    name?: string;
    phone?: string;
  };
  print_temp_bill?: boolean;
  payment_details?: any;
}

export interface OpenShiftRequest {
  terminal_id?: string;
  opening_cash: number;
  opening_notes?: string;
}

export interface CloseShiftRequest {
  actual_cash: number;
  closing_notes?: string;
  cash_deposits?: Array<{
    amount: number;
    deposited_to: string;
    reference: string;
  }>;
  discrepancy_reason?: string;
}

export interface VoidTransactionRequest {
  void_reason: string;
  supervisor_pin?: string;
}

export interface PrintReceiptRequest {
  receipt_type: "final" | "temp" | "duplicate";
  printer_id?: string;
  include_qr?: boolean;
  template_id?: string;
}

// UI State Types
export interface POSState {
  currentShift: Shift | null;
  activeTransaction: Transaction | null;
  cart: {
    items: Array<{
      product: QuickProduct;
      quantity: number;
      modifiers: any[];
      notes?: string;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  categories: POSCategory[];
  products: QuickProduct[];
  selectedCategory: string | null;
  paymentMode: boolean;
  selectedPaymentMethod: PaymentMethod | null;
}

// Dashboard Types
export interface POSDashboard {
  today_sales: number;
  today_transactions: number;
  average_transaction: number;
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recent_transactions: Transaction[];
}

// Printer Types
export interface PrinterStatus {
  printer_id: string;
  status: "online" | "offline" | "error" | "out_of_paper";
  model?: string;
  paper_status?: string;
  error_message?: string;
}