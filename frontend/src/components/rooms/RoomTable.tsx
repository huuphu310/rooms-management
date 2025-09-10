import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash, Eye, Settings } from 'lucide-react';
import type { Room } from '@/services/roomService';
import { formatCurrency } from '@/lib/utils';

interface RoomTableProps {
  rooms: Room[];
  loading?: boolean;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onView: (room: Room) => void;
  onStatusChange: (room: Room) => void;
}

const statusColors = {
  available: 'bg-green-500',
  booked: 'bg-blue-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  blocked: 'bg-gray-500',
};

const statusLabels = {
  available: 'Trống',
  booked: 'Đã đặt',
  occupied: 'Đang ở',
  cleaning: 'Đang dọn',
  maintenance: 'Bảo trì',
  blocked: 'Đã khóa',
};

export const RoomTable: React.FC<RoomTableProps> = ({
  rooms,
  loading,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);

  const handleDeleteClick = (room: Room) => {
    setSelectedRoom(room);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedRoom) {
      onDelete(selectedRoom);
    }
    setDeleteDialogOpen(false);
    setSelectedRoom(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Số phòng</TableHead>
              <TableHead>Loại phòng</TableHead>
              <TableHead className="text-center">Tòa nhà</TableHead>
              <TableHead className="text-center">Tầng</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Giá/đêm</TableHead>
              <TableHead className="text-center">Sức chứa</TableHead>
              <TableHead className="text-center">Hoạt động</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Không có phòng nào
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.room_number}</TableCell>
                  <TableCell>{room.room_type?.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">{room.building_name || '-'}</TableCell>
                  <TableCell className="text-center">{room.floor}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`${statusColors[room.status]} text-white border-0`}
                    >
                      {statusLabels[room.status] || room.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {room.room_type?.base_price 
                      ? formatCurrency(room.room_type.base_price)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    {room.room_type?.max_occupancy || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={room.is_active ? 'default' : 'secondary'}>
                      {room.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(room)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(room)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(room)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Đổi trạng thái
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(room)}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Xóa phòng
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phòng</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                Bạn có chắc chắn muốn xóa phòng <strong>{selectedRoom?.room_number}</strong>?
              </div>
              {selectedRoom?.status !== 'available' && (
                <div className="text-destructive font-medium">
                  ⚠️ Cảnh báo: Phòng đang ở trạng thái "{statusLabels[selectedRoom?.status] || selectedRoom?.status}". 
                  Chỉ có thể xóa phòng khi phòng đang trống (available).
                </div>
              )}
              <div className="text-muted-foreground text-sm">
                Hành động này không thể hoàn tác.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={selectedRoom?.status !== 'available'}
              className={selectedRoom?.status !== 'available' ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};