import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Room } from '@/services/roomService';
import { formatCurrency } from '@/lib/utils';
import { 
  Bed, 
  MapPin, 
  Eye, 
  Calendar, 
  Wrench,
  ClipboardList,
  Users
} from 'lucide-react';

interface RoomDetailModalProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
}

const statusColors = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  reserved: 'bg-blue-500',
};

const statusLabels = {
  available: 'Trống',
  occupied: 'Đang ở',
  cleaning: 'Đang dọn',
  maintenance: 'Bảo trì',
  reserved: 'Đã đặt',
};

const viewTypeLabels: Record<string, string> = {
  city: 'Thành phố',
  garden: 'Vườn',
  pool: 'Hồ bơi',
  mountain: 'Núi',
  ocean: 'Biển',
};

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  open,
  onClose,
  room,
}) => {
  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chi tiết phòng {room.room_number}</DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về phòng và trạng thái hiện tại
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Thông tin cơ bản
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Loại phòng:</span>{' '}
                  {room.room_type?.name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Tầng:</span> {room.floor}
                </span>
              </div>
              {room.view_type && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Hướng nhìn:</span>{' '}
                    {viewTypeLabels[room.view_type] || room.view_type}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Sức chứa:</span>{' '}
                  {room.room_type?.max_occupancy || 'N/A'} người
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status & Price */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Trạng thái & Giá
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Trạng thái hiện tại</p>
                <Badge 
                  variant="outline" 
                  className={`${statusColors[room.status]} text-white border-0`}
                >
                  {statusLabels[room.status] || room.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Giá phòng/đêm</p>
                <p className="text-lg font-semibold">
                  {room.room_type?.base_price 
                    ? formatCurrency(room.room_type.base_price)
                    : 'N/A'}
                </p>
              </div>
              {room.room_type?.weekend_price && (
                <div>
                  <p className="text-sm font-medium mb-1">Giá cuối tuần</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(room.room_type.weekend_price)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Hoạt động</p>
                <Badge variant={room.is_active ? 'default' : 'secondary'}>
                  {room.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Room Type Details */}
          {room.room_type && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Chi tiết loại phòng
                </h3>
                <div className="space-y-2">
                  {room.room_type.size_sqm && (
                    <p className="text-sm">
                      <span className="font-medium">Diện tích:</span>{' '}
                      {room.room_type.size_sqm} m²
                    </p>
                  )}
                  {room.room_type.description && (
                    <p className="text-sm">
                      <span className="font-medium">Mô tả:</span>{' '}
                      {room.room_type.description}
                    </p>
                  )}
                  {room.room_type.extra_person_charge && (
                    <p className="text-sm">
                      <span className="font-medium">Phụ thu thêm người:</span>{' '}
                      {formatCurrency(room.room_type.extra_person_charge)}/người
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Maintenance Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Thông tin bảo trì
            </h3>
            <div className="space-y-2">
              {room.last_cleaned_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Dọn dẹp lần cuối:</span>{' '}
                    {new Date(room.last_cleaned_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
              {room.next_maintenance_date && (
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Bảo trì tiếp theo:</span>{' '}
                    {new Date(room.next_maintenance_date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {room.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Ghi chú
                </h3>
                <p className="text-sm text-muted-foreground">{room.notes}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="text-xs text-muted-foreground">
            <p>Tạo lúc: {new Date(room.created_at).toLocaleString('vi-VN')}</p>
            <p>Cập nhật: {new Date(room.updated_at).toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};