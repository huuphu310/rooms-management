import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RoomTable } from '@/components/rooms/RoomTable';
import { RoomForm } from '@/components/rooms/RoomForm';
import { RoomDetailModal } from '@/components/rooms/RoomDetailModal';
import { RoomStatusModal } from '@/components/rooms/RoomStatusModal';
import roomService, { type Room, type RoomFilters } from '@/services/roomService';

export const RoomsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filters, setFilters] = useState<RoomFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: '',
    floor: undefined,
    room_type_id: '',
  });

  // Fetch room types
  const { data: roomTypesData } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: () => roomService.getRoomTypes(),
  });

  // Fetch rooms
  const { data: roomsData, isLoading, refetch } = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => roomService.getRooms(filters),
  });

  // Create room mutation
  const createMutation = useMutation({
    mutationFn: roomService.createRoom,
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Thêm phòng mới thành công',
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể thêm phòng',
        variant: 'destructive',
      });
    },
  });

  // Update room mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      roomService.updateRoom(id, data),
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Cập nhật phòng thành công',
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormOpen(false);
      setSelectedRoom(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể cập nhật phòng',
        variant: 'destructive',
      });
    },
  });

  // Update room status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; notes?: string } }) => 
      roomService.updateRoomStatus(id, data.status, data.notes),
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Cập nhật trạng thái phòng thành công',
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setStatusOpen(false);
      setSelectedRoom(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
    },
  });

  // Delete room mutation
  const deleteMutation = useMutation({
    mutationFn: roomService.deleteRoom,
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Xóa phòng thành công',
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể xóa phòng',
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setSelectedRoom(null);
    setFormOpen(true);
  };

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setFormOpen(true);
  };

  const handleDelete = (room: Room) => {
    deleteMutation.mutate(room.id);
  };

  const handleView = (room: Room) => {
    setSelectedRoom(room);
    setDetailOpen(true);
  };

  const handleStatusChange = (room: Room) => {
    setSelectedRoom(room);
    setStatusOpen(true);
  };

  const handleStatusSubmit = async (data: { status: string; notes?: string }) => {
    if (selectedRoom) {
      await statusMutation.mutateAsync({ id: selectedRoom.id, data });
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedRoom) {
      await updateMutation.mutateAsync({ id: selectedRoom.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const roomTypes = roomTypesData?.data || [];
  const rooms = roomsData?.data || [];
  const pagination = roomsData?.pagination;

  // Statistics
  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin và trạng thái các phòng trong khách sạn
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm phòng
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng số phòng</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Phòng trống</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang ở</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.occupied}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang dọn</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.cleaning}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bảo trì</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.maintenance}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm số phòng..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="available">Trống</SelectItem>
                <SelectItem value="occupied">Đang ở</SelectItem>
                <SelectItem value="cleaning">Đang dọn</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="reserved">Đã đặt</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.room_type_id || 'all'}
              onValueChange={(value) => handleFilterChange('room_type_id', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả loại phòng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.floor?.toString() || 'all'}
              onValueChange={(value) => handleFilterChange('floor', value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả tầng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {[1, 2, 3, 4, 5].map((floor) => (
                  <SelectItem key={floor} value={floor.toString()}>
                    Tầng {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <RoomTable
            rooms={rooms}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {' '}
            {pagination.total} phòng
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Trước
            </Button>
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === pagination.total_pages || 
                Math.abs(page - pagination.page) <= 2
              )
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2">...</span>
                  )}
                  <Button
                    variant={page === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                </React.Fragment>
              ))
            }
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.total_pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <RoomForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedRoom(null);
        }}
        onSubmit={handleFormSubmit}
        room={selectedRoom}
        roomTypes={roomTypes}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Detail Modal */}
      <RoomDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
      />

      {/* Status Change Modal */}
      <RoomStatusModal
        open={statusOpen}
        onClose={() => {
          setStatusOpen(false);
          setSelectedRoom(null);
        }}
        onSubmit={handleStatusSubmit}
        room={selectedRoom}
        loading={statusMutation.isPending}
      />
    </div>
  );
};