import { api } from '@/lib/api';

export interface Building {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  total_floors: number;
  total_rooms?: number;
  has_elevator: boolean;
  has_parking: boolean;
  has_pool: boolean;
  has_gym: boolean;
  has_restaurant: boolean;
  display_order: number;
  is_main_building: boolean;
  reception_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  available_rooms?: number;
  occupied_rooms?: number;
}

export interface BuildingCreateInput {
  name: string;
  code?: string;
  description?: string;
  address?: string;
  total_floors: number;
  has_elevator?: boolean;
  has_parking?: boolean;
  has_pool?: boolean;
  has_gym?: boolean;
  has_restaurant?: boolean;
  display_order?: number;
  is_main_building?: boolean;
  reception_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  notes?: string;
}

export interface BuildingUpdateInput {
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  total_floors?: number;
  has_elevator?: boolean;
  has_parking?: boolean;
  has_pool?: boolean;
  has_gym?: boolean;
  has_restaurant?: boolean;
  display_order?: number;
  is_main_building?: boolean;
  reception_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  notes?: string;
}

export interface BuildingListResponse {
  data: Building[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class BuildingService {
  async getBuildings(params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: string;
    include_inactive?: boolean;
  }): Promise<BuildingListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.include_inactive) queryParams.append('include_inactive', params.include_inactive.toString());

    const response = await api.get(`/buildings?${queryParams}`);
    return response.data;
  }

  async getBuilding(id: string): Promise<Building> {
    const response = await api.get(`/buildings/${id}`);
    return response.data;
  }

  async createBuilding(data: BuildingCreateInput): Promise<Building> {
    const response = await api.post('/buildings', data);
    return response.data;
  }

  async updateBuilding(id: string, data: BuildingUpdateInput): Promise<Building> {
    const response = await api.put(`/buildings/${id}`, data);
    return response.data;
  }

  async deleteBuilding(id: string): Promise<void> {
    await api.delete(`/buildings/${id}`);
  }
}

export default new BuildingService();