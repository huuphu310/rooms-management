export interface FolioPosting {
  id: string;
  type: 'room' | 'pos' | 'surcharge' | 'discount' | 'tax' | 'deposit' | 'payment' | 'refund' | 'adjustment';
  date: string;
  time?: string;
  description: string;
  reference?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax: number;
  total: number;
  is_void: boolean;
  void_reason?: string;
  surcharge_type?: string;
  discount_type?: string;
}

export interface FolioSummary {
  room_charges: number;
  pos_charges: number;
  surcharges: number;
  discounts: number;
  subtotal: number;
  taxes: number;
  grand_total: number;
  deposits: number;
  payments: number;
  refunds: number;
  total_credits: number;
  balance_due: number;
}

export interface FolioStatement {
  folio_id: string;
  folio_number: string;
  booking_id: string;
  created_at: string;
  is_closed: boolean;
  closed_at?: string;
  postings_by_type: {
    room_charges: FolioPosting[];
    pos_charges: FolioPosting[];
    surcharges: FolioPosting[];
    discounts: FolioPosting[];
    taxes: FolioPosting[];
    deposits: FolioPosting[];
    payments: FolioPosting[];
    refunds: FolioPosting[];
    adjustments: FolioPosting[];
  };
  summary: FolioSummary;
}

export interface FolioDetails {
  folio: {
    id: string;
    folio_number: string;
    booking_id: string;
    booking_code: string;
    guest: {
      full_name: string;
      email: string;
      phone: string;
    };
    dates: {
      check_in: string;
      check_out: string;
    };
    is_closed: boolean;
    created_at: string;
  };
  postings: FolioPosting[];
  summary: {
    total_charges: number;
    total_credits: number;
    balance: number;
  };
}

export interface FolioListItem {
  id: string;
  folio_number: string;
  booking_id: string;
  booking_code: string;
  guest_name: string;
  total_charges: number;
  total_credits: number;
  balance: number;
  is_closed: boolean;
  created_at: string;
}

export interface DepositRecord {
  id: string;
  booking_id: string;
  deposit_type: 'percentage' | 'fixed' | 'full';
  required_amount: number;
  paid_amount: number;
  state: 'held' | 'captured' | 'released' | 'refunded' | 'expired';
  payment_method?: string;
  payment_date?: string;
  refund_amount?: number;
  refund_date?: string;
  refund_reason?: string;
  expires_at?: string;
  created_at: string;
}

export interface CheckoutSummary {
  booking_id: string;
  booking_code: string;
  guest_name: string;
  check_in_date: string;
  original_checkout: string;
  checkout_date: string;
  is_early_checkout: boolean;
  potential_early_checkout_fee: number;
  statement: FolioStatement;
  final_balance: number;
  payment_required: boolean;
}