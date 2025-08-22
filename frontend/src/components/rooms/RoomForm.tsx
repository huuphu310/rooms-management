import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Room, RoomType, RoomCreateInput, RoomUpdateInput } from '@/services/roomService';

const roomSchema = z.object({
  room_number: z.string().min(1, 'Số phòng là bắt buộc').max(20),
  room_type_id: z.string().min(1, 'Loại phòng là bắt buộc'),
  floor: z.number().min(0, 'Tầng phải >= 0').max(100, 'Tầng phải <= 100'),
  view_type: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface RoomFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RoomCreateInput | RoomUpdateInput) => Promise<void>;
  room?: Room | null;
  roomTypes: RoomType[];
  loading?: boolean;
}

const viewTypes = [
  { value: 'city', label: 'Thành phố' },
  { value: 'garden', label: 'Vườn' },
  { value: 'pool', label: 'Hồ bơi' },
  { value: 'mountain', label: 'Núi' },
  { value: 'ocean', label: 'Biển' },
];

const statusOptions = [
  { value: 'available', label: 'Trống' },
  { value: 'occupied', label: 'Đang ở' },
  { value: 'cleaning', label: 'Đang dọn' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'reserved', label: 'Đã đặt' },
];

export const RoomForm: React.FC<RoomFormProps> = ({
  open,
  onClose,
  onSubmit,
  room,
  roomTypes,
  loading,
}) => {
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      room_number: '',
      room_type_id: '',
      floor: 1,
      view_type: '',
      status: 'available',
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        room_number: room.room_number,
        room_type_id: room.room_type_id,
        floor: room.floor,
        view_type: room.view_type || '',
        status: room.status,
        notes: room.notes || '',
        is_active: room.is_active,
      });
    } else {
      form.reset({
        room_number: '',
        room_type_id: '',
        floor: 1,
        view_type: undefined,
        status: 'available',
        notes: '',
        is_active: true,
      });
    }
  }, [room, form]);

  const handleSubmit = async (values: RoomFormValues) => {
    try {
      if (room) {
        // Update room - only send changed fields
        const updateData: RoomUpdateInput = {};
        if (values.room_number !== room.room_number) updateData.room_number = values.room_number;
        if (values.room_type_id !== room.room_type_id) updateData.room_type_id = values.room_type_id;
        if (values.floor !== room.floor) updateData.floor = values.floor;
        if (values.view_type !== room.view_type) updateData.view_type = values.view_type;
        if (values.status !== room.status) updateData.status = values.status;
        if (values.notes !== room.notes) updateData.notes = values.notes;
        if (values.is_active !== room.is_active) updateData.is_active = values.is_active;
        
        await onSubmit(updateData);
      } else {
        // Create new room
        await onSubmit(values as RoomCreateInput);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</DialogTitle>
          <DialogDescription>
            {room 
              ? 'Cập nhật thông tin phòng' 
              : 'Điền thông tin để thêm phòng mới vào hệ thống'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="room_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số phòng *</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: 101, 202..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tầng *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="room_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại phòng *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại phòng" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND'
                          }).format(type.base_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="view_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hướng nhìn</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hướng nhìn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {viewTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú về phòng..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {room && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Kích hoạt</FormLabel>
                      <FormDescription>
                        Phòng sẽ hiển thị và có thể đặt khi được kích hoạt
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : room ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};