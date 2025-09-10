import { api } from '../api';
import type {
  Transaction,
  CreateTransactionRequest,
  ProcessPaymentRequest,
  Payment,
  QRPaymentInit,
  PaymentStatusCheck,
  Shift,
  ShiftSummary,
  OpenShiftRequest,
  CloseShiftRequest,
  VoidTransactionRequest,
  PrintReceiptRequest,
  Receipt,
  POSCategory,
  ProductModifier,
  QuickProduct,
  ReceiptTemplate,
  DailySummary,
  POSDashboard,
  PrinterStatus
} from '@/types/pos';

export const posApi = {
  // ============= Transactions =============
  
  createTransaction: async (data: CreateTransactionRequest): Promise<Transaction> => {
    const response = await api.post('/pos/transactions/create', data);
    return response.data;
  },

  getTransaction: async (transactionId: string): Promise<Transaction> => {
    const response = await api.get(`/pos/transactions/${transactionId}`);
    return response.data;
  },

  processPayment: async (
    transactionId: string,
    data: ProcessPaymentRequest
  ): Promise<Payment | QRPaymentInit> => {
    const response = await api.post(
      `/pos/transactions/${transactionId}/payment`,
      data
    );
    return response.data;
  },

  checkPaymentStatus: async (transactionId: string): Promise<PaymentStatusCheck> => {
    const response = await api.get(`/pos/transactions/${transactionId}/payment-status`);
    return response.data;
  },

  voidTransaction: async (
    transactionId: string,
    data: VoidTransactionRequest
  ): Promise<Transaction> => {
    const response = await api.post(
      `/pos/transactions/${transactionId}/void`,
      data
    );
    return response.data;
  },

  printReceipt: async (
    transactionId: string,
    data: PrintReceiptRequest
  ): Promise<Receipt> => {
    const response = await api.post(
      `/pos/transactions/${transactionId}/print-receipt`,
      data
    );
    return response.data;
  },

  searchTransactions: async (params: any): Promise<Transaction[]> => {
    const response = await api.post('/pos/transactions/search', params);
    return response.data;
  },

  // ============= Shifts =============

  openShift: async (data: OpenShiftRequest): Promise<Shift> => {
    const response = await api.post('/pos/shifts/open', data);
    return response.data;
  },

  getCurrentShift: async (): Promise<Shift> => {
    const response = await api.get('/pos/shifts/current');
    return response.data;
  },

  getShift: async (shiftId: string): Promise<Shift> => {
    const response = await api.get(`/pos/shifts/${shiftId}`);
    return response.data;
  },

  closeShift: async (shiftId: string, data: CloseShiftRequest): Promise<ShiftSummary> => {
    const response = await api.post(`/pos/shifts/${shiftId}/close`, data);
    return response.data;
  },

  getShiftSummary: async (shiftId: string): Promise<ShiftSummary> => {
    const response = await api.get(`/pos/shifts/${shiftId}/summary`);
    return response.data;
  },

  // ============= Categories & Products =============

  getCategories: async (params?: {
    is_active?: boolean;
    is_featured?: boolean;
    parent_id?: string;
  }): Promise<POSCategory[]> => {
    const response = await api.get('/pos/categories', { params });
    return response.data;
  },

  createCategory: async (data: Partial<POSCategory>): Promise<POSCategory> => {
    const response = await api.post('/pos/categories', data);
    return response.data;
  },

  updateCategory: async (
    categoryId: string,
    data: Partial<POSCategory>
  ): Promise<POSCategory> => {
    const response = await api.put(`/pos/categories/${categoryId}`, data);
    return response.data;
  },

  getProductModifiers: async (productId: string): Promise<ProductModifier[]> => {
    const response = await api.get(`/pos/products/${productId}/modifiers`);
    return response.data;
  },

  getQuickAccessProducts: async (params?: {
    category_id?: string;
    search?: string;
    is_featured?: boolean;
  }): Promise<QuickProduct[]> => {
    const response = await api.get('/pos/products/quick-access', { params });
    return response.data;
  },

  getProductByBarcode: async (barcode: string): Promise<QuickProduct> => {
    const response = await api.get(`/pos/products/barcode/${barcode}`);
    return response.data;
  },

  // ============= Receipt Templates =============

  getReceiptTemplates: async (params?: {
    is_active?: boolean;
    template_type?: string;
  }): Promise<ReceiptTemplate[]> => {
    const response = await api.get('/pos/receipt-templates', { params });
    return response.data;
  },

  createReceiptTemplate: async (data: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> => {
    const response = await api.post('/pos/receipt-templates', data);
    return response.data;
  },

  updateReceiptTemplate: async (
    templateId: string,
    data: Partial<ReceiptTemplate>
  ): Promise<ReceiptTemplate> => {
    const response = await api.put(`/pos/receipt-templates/${templateId}`, data);
    return response.data;
  },

  deleteReceiptTemplate: async (templateId: string): Promise<void> => {
    await api.delete(`/pos/receipt-templates/${templateId}`);
  },

  // ============= Reports =============

  getDailySummary: async (params: {
    date: string;
    terminal_id?: string;
    cashier_id?: string;
  }): Promise<DailySummary> => {
    const response = await api.get('/pos/reports/daily-summary', { params });
    return response.data;
  },

  getProductSalesReport: async (params: {
    date_from: string;
    date_to: string;
    category_id?: string;
    product_id?: string;
  }): Promise<any> => {
    const response = await api.get('/pos/reports/product-sales', { params });
    return response.data;
  },

  getHourlySales: async (params: {
    date: string;
    terminal_id?: string;
  }): Promise<any> => {
    const response = await api.get('/pos/reports/hourly-sales', { params });
    return response.data;
  },

  getPaymentMethodReport: async (params: {
    date_from: string;
    date_to: string;
  }): Promise<any> => {
    const response = await api.get('/pos/reports/payment-methods', { params });
    return response.data;
  },

  // ============= Dashboard =============

  getDashboardStats: async (): Promise<POSDashboard> => {
    const response = await api.get('/pos/dashboard/stats');
    return response.data;
  },

  getLiveTransactionFeed: async (limit?: number): Promise<Transaction[]> => {
    const response = await api.get('/pos/dashboard/live-feed', {
      params: { limit: limit || 10 }
    });
    return response.data;
  },

  // ============= Printers =============

  getPrinters: async (): Promise<PrinterStatus[]> => {
    const response = await api.get('/pos/printers');
    return response.data;
  },

  getPrinterStatus: async (printerId: string): Promise<PrinterStatus> => {
    const response = await api.get(`/pos/printers/${printerId}/status`);
    return response.data;
  },

  testPrinter: async (printerId: string, testType: string = 'alignment'): Promise<void> => {
    await api.post(`/pos/printers/${printerId}/test`, { test_type: testType });
  }
};

// Helper functions for POS operations

export const calculateCartTotals = (items: any[]) => {
  let subtotal = 0;
  
  items.forEach(item => {
    const itemTotal = item.quantity * item.product.price;
    const modifierTotal = item.modifiers.reduce((sum: number, mod: any) => {
      return sum + (mod.price_adjustment || 0) * item.quantity;
    }, 0);
    subtotal += itemTotal + modifierTotal;
  });
  
  const tax = subtotal * 0.1; // 10% VAT
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total,
    discount: 0,
    service_charge: 0
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatReceiptNumber = (number: string): string => {
  return number || 'PENDING';
};

export const getPaymentMethodLabel = (method: string): string => {
  const labels: { [key: string]: string } = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    credit_card: 'Credit Card',
    room_charge: 'Room Charge',
    qr_code: 'QR Payment'
  };
  return labels[method] || method;
};

export const getTransactionStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    active: 'blue',
    completed: 'green',
    void: 'red',
    refunded: 'orange'
  };
  return colors[status] || 'gray';
};

export const getPaymentStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    pending: 'yellow',
    partial: 'orange',
    completed: 'green',
    void: 'red'
  };
  return colors[status] || 'gray';
};