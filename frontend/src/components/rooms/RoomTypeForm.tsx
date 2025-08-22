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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RoomType } from '@/services/roomService';

const roomTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  base_price: z.number().min(0, 'Base price must be positive'),
  weekend_price: z.number().min(0).optional(),
  max_occupancy: z.number().min(1).max(10),
  min_occupancy: z.number().min(1).max(10),
  max_adults: z.number().min(1).max(10),
  max_children: z.number().min(0).max(10),
  extra_adult_charge: z.number().min(0),
  extra_child_charge: z.number().min(0),
  size_sqm: z.number().min(0).optional(),
  min_stay_nights: z.number().min(1).optional(),
  max_stay_nights: z.number().min(1).optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
}).refine(data => {
  if (data.weekend_price && data.weekend_price < data.base_price) {
    return false;
  }
  return true;
}, {
  message: "Weekend price must be greater than or equal to base price",
  path: ["weekend_price"]
}).refine(data => {
  if (data.min_occupancy > data.max_occupancy) {
    return false;
  }
  return true;
}, {
  message: "Minimum occupancy must be less than or equal to maximum occupancy",
  path: ["min_occupancy"]
}).refine(data => {
  if (data.max_adults > data.max_occupancy) {
    return false;
  }
  return true;
}, {
  message: "Maximum adults cannot exceed maximum occupancy",
  path: ["max_adults"]
}).refine(data => {
  if (data.min_stay_nights && data.max_stay_nights && data.max_stay_nights < data.min_stay_nights) {
    return false;
  }
  return true;
}, {
  message: "Maximum stay nights must be greater than or equal to minimum stay nights",
  path: ["max_stay_nights"]
});

type RoomTypeFormValues = z.infer<typeof roomTypeSchema>;

interface RoomTypeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  roomType?: RoomType | null;
  loading?: boolean;
}

export const RoomTypeForm: React.FC<RoomTypeFormProps> = ({
  open,
  onClose,
  onSubmit,
  roomType,
  loading,
}) => {
  const { t, language } = useLanguage();
  
  const form = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: '',
      base_price: 0,
      weekend_price: undefined,
      max_occupancy: 2,
      min_occupancy: 1,
      max_adults: 2,
      max_children: 0,
      extra_adult_charge: 0,
      extra_child_charge: 0,
      size_sqm: undefined,
      min_stay_nights: undefined,
      max_stay_nights: undefined,
      description: '',
      amenities: [],
      is_active: true,
    },
  });

  useEffect(() => {
    if (roomType) {
      form.reset({
        name: roomType.name,
        base_price: Number(roomType.base_price),
        weekend_price: roomType.weekend_price ? Number(roomType.weekend_price) : undefined,
        max_occupancy: roomType.max_occupancy,
        min_occupancy: roomType.min_occupancy || 1,
        max_adults: roomType.max_adults || roomType.max_occupancy,
        max_children: roomType.max_children || 0,
        extra_adult_charge: Number(roomType.extra_adult_charge || 0),
        extra_child_charge: Number(roomType.extra_child_charge || 0),
        size_sqm: roomType.size_sqm ? Number(roomType.size_sqm) : undefined,
        min_stay_nights: roomType.min_stay_nights ? Number(roomType.min_stay_nights) : undefined,
        max_stay_nights: roomType.max_stay_nights ? Number(roomType.max_stay_nights) : undefined,
        description: roomType.description || '',
        amenities: roomType.amenities || [],
        is_active: roomType.is_active,
      });
    } else {
      form.reset();
    }
  }, [roomType, form]);

  const handleSubmit = async (values: RoomTypeFormValues) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {roomType ? t('roomTypes.editRoomType') : t('roomTypes.addRoomType')}
          </DialogTitle>
          <DialogDescription>
            {roomType 
              ? t('roomTypes.subtitle')
              : t('roomTypes.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('roomTypes.typeName')} *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.basePrice')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weekend_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.weekendPrice')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_occupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.minOccupancy')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_occupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.maxOccupancy')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_adults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.maxAdults')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi' 
                        ? 'Số người lớn tối đa có thể ở trong phòng'
                        : 'Maximum number of adults allowed in the room'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_children"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.maxChildren')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi'
                        ? 'Số trẻ em tối đa có thể ở trong phòng'
                        : 'Maximum number of children allowed in the room'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="extra_adult_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.extraAdultCharge')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi'
                        ? 'Phụ thu cho mỗi người lớn vượt quá số lượng tối thiểu'
                        : 'Extra charge per adult exceeding minimum occupancy'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extra_child_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.extraChildCharge')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi'
                        ? 'Phụ thu cho mỗi trẻ em'
                        : 'Extra charge per child'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="size_sqm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('roomTypes.sizeSquareMeters')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      {...field} 
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_stay_nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.minStayNights')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi'
                        ? 'Số đêm tối thiểu phải ở'
                        : 'Minimum nights required for booking'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_stay_nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.maxStayNights')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {language === 'vi'
                        ? 'Số đêm tối đa có thể ở'
                        : 'Maximum nights allowed for booking'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {roomType && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t('common.active')}</FormLabel>
                      <FormDescription>
                        {language === 'vi'
                          ? 'Loại phòng sẽ hiển thị và có thể đặt khi được kích hoạt'
                          : 'Room type will be visible and bookable when active'}
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading') : roomType ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};