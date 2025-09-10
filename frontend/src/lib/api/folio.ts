import { api } from '../api';
import type { 
  FolioStatement, 
  FolioDetails, 
  FolioListItem, 
  CheckoutSummary,
  DepositRecord 
} from '@/types/folio';

export const folioApi = {
  // Get folio statement by booking ID
  async getByBookingId(bookingId: string): Promise<FolioStatement> {
    const { data } = await api.get(`/folio/booking/${bookingId}`);
    return data.data;
  },

  // Get folio details by folio ID
  async getById(folioId: string): Promise<FolioDetails> {
    const { data } = await api.get(`/folio/${folioId}`);
    return data.data;
  },

  // List all folios
  async list(params?: {
    page?: number;
    limit?: number;
    is_closed?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<{ folios: FolioListItem[]; pagination: any }> {
    const { data } = await api.get('/folio/', { params });
    return { folios: data.data, pagination: data.pagination };
  },

  // Get folio balance
  async getBalance(folioId: string): Promise<{ balance: number; status: string }> {
    const { data } = await api.get(`/folio/${folioId}/balance`);
    return data.data;
  },

  // Close folio
  async close(folioId: string): Promise<any> {
    const { data } = await api.post(`/folio/${folioId}/close`);
    return data.data;
  },

  // Reopen folio
  async reopen(folioId: string): Promise<any> {
    const { data } = await api.post(`/folio/${folioId}/reopen`);
    return data.data;
  }
};

export const depositApi = {
  // Confirm deposit
  async confirm(params: {
    booking_id: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
    notes?: string;
  }): Promise<any> {
    const { data } = await api.post('/deposits/confirm', params);
    return data.data;
  },

  // Get booking deposits
  async getByBookingId(bookingId: string): Promise<DepositRecord[]> {
    const { data } = await api.get(`/deposits/booking/${bookingId}`);
    return data.data;
  },

  // Process refund
  async refund(params: {
    deposit_id: string;
    refund_amount: number;
    reason: string;
    notes?: string;
  }): Promise<any> {
    const { data } = await api.post('/deposits/refund', params);
    return data.data;
  },

  // Get expired deposits
  async getExpired(): Promise<DepositRecord[]> {
    const { data } = await api.get('/deposits/expired');
    return data.data;
  },

  // Release expired deposits
  async releaseExpired(): Promise<any> {
    const { data } = await api.post('/deposits/release-expired');
    return data.data;
  }
};

export const checkoutApi = {
  // Get checkout summary
  async getSummary(bookingId: string, checkoutDate?: string): Promise<CheckoutSummary> {
    const { data } = await api.post('/checkout/summary', {
      booking_id: bookingId,
      checkout_date: checkoutDate
    });
    return data.data;
  },

  // Process early checkout
  async processEarly(params: {
    booking_id: string;
    checkout_date: string;
    reason?: string;
    waive_surcharge?: boolean;
  }): Promise<any> {
    const { data } = await api.post('/checkout/early', params);
    return data.data;
  },

  // Complete checkout
  async complete(bookingId: string, paymentAmount?: number, paymentMethod?: string): Promise<any> {
    const { data } = await api.post(`/checkout/complete`, {
      booking_id: bookingId,
      payment_amount: paymentAmount,
      payment_method: paymentMethod
    });
    return data.data;
  },

  // Process no-show
  async processNoShow(bookingId: string, chargePercentage: number = 100): Promise<any> {
    const { data } = await api.post('/checkout/no-show', {
      booking_id: bookingId,
      charge_percentage: chargePercentage
    });
    return data.data;
  }
};