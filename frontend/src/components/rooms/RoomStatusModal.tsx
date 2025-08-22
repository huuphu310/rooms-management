import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Room } from '@/services/roomService';
import { AlertCircle, ArrowRight } from 'lucide-react';

const statusSchema = z.object({
  status: z.string().min(1, 'Vui lòng chọn trạng thái'),
  notes: z.string().optional(),
});

type StatusFormValues = z.infer<typeof statusSchema>;

interface RoomStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { status: string; notes?: string }) => Promise<void>;
  room: Room | null;
  loading?: boolean;
}

const statusOptions = [
  { value: 'available', label: 'Trống', color: 'bg-green-500' },
  { value: 'occupied', label: 'Đang ở', color: 'bg-red-500' },
  { value: 'cleaning', label: 'Đang dọn', color: 'bg-yellow-500' },
  { value: 'maintenance', label: 'Bảo trì', color: 'bg-orange-500' },
  { value: 'reserved', label: 'Đã đặt', color: 'bg-blue-500' },
];

const statusTransitions: Record<string, string[]> = {
  available: ['occupied', 'maintenance', 'reserved'],
  occupied: ['cleaning'],
  cleaning: ['available', 'maintenance'],
  maintenance: ['available'],
  reserved: ['occupied', 'available'],
};

const transitionMessages: Record<string, Record<string, string>> = {
  available: {
    occupied: 'Phòng sẽ được chuyển sang trạng thái "Đang ở" khi khách check-in',
    maintenance: 'Phòng sẽ được chuyển sang bảo trì và không thể đặt',
    reserved: 'Phòng sẽ được giữ cho khách đã đặt trước',
  },
  occupied: {
    cleaning: 'Phòng sẽ được dọn dẹp sau khi khách check-out',
  },
  cleaning: {
    available: 'Phòng đã được dọn dẹp và sẵn sàng cho khách mới',
    maintenance: 'Phòng cần bảo trì sau khi dọn dẹp',
  },
  maintenance: {
    available: 'Phòng đã hoàn tất bảo trì và sẵn sàng sử dụng',
  },
  reserved: {
    occupied: 'Khách đã check-in vào phòng đặt trước',
    available: 'Hủy đặt phòng và chuyển về trạng thái trống',
  },
};

export const RoomStatusModal: React.FC<RoomStatusModalProps> = ({
  open,
  onClose,
  onSubmit,
  room,
  loading,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: '',
      notes: '',
    },
  });

  if (!room) return null;

  const currentStatus = room.status;
  const allowedTransitions = statusTransitions[currentStatus] || [];
  const currentStatusInfo = statusOptions.find(s => s.value === currentStatus);

  const handleSubmit = async (values: StatusFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
      setSelectedStatus('');
      onClose();
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    form.setValue('status', value);
  };

  const getTransitionMessage = () => {
    if (!selectedStatus || !transitionMessages[currentStatus]) return null;
    return transitionMessages[currentStatus][selectedStatus];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thay đổi trạng thái phòng {room.room_number}</DialogTitle>
          <DialogDescription>
            Chọn trạng thái mới cho phòng và thêm ghi chú nếu cần
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Trạng thái hiện tại:</span>
            <Badge 
              variant="outline" 
              className={`${currentStatusInfo?.color} text-white border-0`}
            >
              {currentStatusInfo?.label}
            </Badge>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái mới *</FormLabel>
                    <Select 
                      onValueChange={handleStatusChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái mới" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowedTransitions.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Không có trạng thái nào có thể chuyển đổi
                          </div>
                        ) : (
                          allowedTransitions.map((status) => {
                            const option = statusOptions.find(s => s.value === status);
                            return option ? (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`${option.color} text-white border-0 text-xs`}
                                  >
                                    {option.label}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ) : null;
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transition Message */}
              {selectedStatus && getTransitionMessage() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {getTransitionMessage()}
                  </AlertDescription>
                </Alert>
              )}

              {/* Visual Transition */}
              {selectedStatus && (
                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge 
                    variant="outline" 
                    className={`${currentStatusInfo?.color} text-white border-0`}
                  >
                    {currentStatusInfo?.label}
                  </Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge 
                    variant="outline" 
                    className={`${statusOptions.find(s => s.value === selectedStatus)?.color} text-white border-0`}
                  >
                    {statusOptions.find(s => s.value === selectedStatus)?.label}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Thêm ghi chú về việc thay đổi trạng thái..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ghi chú này sẽ được lưu vào lịch sử thay đổi trạng thái
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || allowedTransitions.length === 0}
                >
                  {loading ? 'Đang xử lý...' : 'Cập nhật trạng thái'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};