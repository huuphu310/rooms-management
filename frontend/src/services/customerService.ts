import { api } from '@/lib/api';

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  status: string;
  loyalty_points: number;
  total_bookings: number;
  total_spent: number;
  created_at: string;
  updated_at?: string;
  date_of_birth?: string;
  id_type?: string;
  id_number?: string;
  address?: string;
  notes?: string;
  preferences?: any;
  is_active?: boolean;
}

export interface CustomerListResponse {
  data: Customer[];
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
}

class CustomerService {
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<CustomerListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = `/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await api.get<CustomerListResponse>(url);
    return response.data;
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await api.get<Customer>(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const response = await api.post<Customer>('/customers', customer);
    return response.data;
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const response = await api.put<Customer>(`/customers/${id}`, customer);
    return response.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  }

  async searchCustomers(searchTerm: string): Promise<CustomerListResponse> {
    const response = await api.get<CustomerListResponse>(`/customers?search=${encodeURIComponent(searchTerm)}`);
    return response.data;
  }

  async getCustomerBookings(id: string): Promise<any> {
    const response = await api.get(`/customers/${id}/bookings`);
    return response.data;
  }

  async mergeCustomers(primaryId: string, duplicateId: string): Promise<Customer> {
    const response = await api.post<Customer>('/customers/merge', {
      primary_id: primaryId,
      duplicate_id: duplicateId,
    });
    return response.data;
  }
}

export const customerService = new CustomerService();