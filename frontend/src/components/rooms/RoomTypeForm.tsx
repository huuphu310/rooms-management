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
import { ShiftPricingConfig } from './ShiftPricingConfig';

const roomTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  base_price: z.number().min(0, 'Base price must be positive'),
  weekend_price: z.number().min(0).optional(),
  max_occupancy: z.number().min(1).max(10),
  min_occupancy: z.number().min(1).max(10), // Keep for backward compatibility
  max_adults: z.number().min(1).max(10),
  max_children: z.number().min(0).max(10),
  // New separate occupancy fields
  standard_adults_occupancy: z.number().min(1).max(10),
  standard_children_occupancy: z.number().min(0).max(10),
  extra_adult_charge: z.number().min(0),
  extra_child_charge: z.number().min(0),
  extra_single_bed_charge: z.number().min(0).optional(),
  extra_double_bed_charge: z.number().min(0).optional(),
  size_sqm: z.number().min(0).optional(),
  min_stay_nights: z.number().min(1).optional(),
  max_stay_nights: z.number().min(1).optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  cleaning_time_minutes: z.number().min(0).max(240).optional(),
  // Shift-based pricing fields
  pricing_mode: z.enum(['traditional', 'shift']).optional(),
  day_shift_price: z.number().min(0).optional(),
  night_shift_price: z.number().min(0).optional(),
  full_day_price: z.number().min(0).optional(),
  weekend_day_shift_price: z.number().min(0).optional(),
  weekend_night_shift_price: z.number().min(0).optional(),
  weekend_full_day_price: z.number().min(0).optional(),
  holiday_day_shift_price: z.number().min(0).optional(),
  holiday_night_shift_price: z.number().min(0).optional(),
  holiday_full_day_price: z.number().min(0).optional(),
  day_shift_start_time: z.string().optional(),
  day_shift_end_time: z.string().optional(),
  night_shift_start_time: z.string().optional(),
  night_shift_end_time: z.string().optional(),
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
  if ((data.standard_adults_occupancy + data.standard_children_occupancy) > data.max_occupancy) {
    return false;
  }
  return true;
}, {
  message: "Total standard occupancy (adults + children) cannot exceed maximum occupancy",
  path: ["standard_adults_occupancy"]
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
  const { t } = useLanguage();
  
  const form = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    mode: 'onChange', // Enable validation on change
    defaultValues: {
      name: '',
      base_price: 0,
      weekend_price: undefined,
      max_occupancy: 2,
      min_occupancy: 1, // Keep for backward compatibility
      max_adults: 2,
      max_children: 0,
      standard_adults_occupancy: 2,
      standard_children_occupancy: 0,
      extra_adult_charge: 0,
      extra_child_charge: 0,
      extra_single_bed_charge: undefined,
      extra_double_bed_charge: undefined,
      size_sqm: undefined,
      min_stay_nights: undefined,
      max_stay_nights: undefined,
      description: '',
      amenities: [],
      is_active: true,
      // Shift pricing defaults
      pricing_mode: 'traditional',
      day_shift_price: 0,
      night_shift_price: 0,
      full_day_price: 0,
      weekend_day_shift_price: undefined,
      weekend_night_shift_price: undefined,
      weekend_full_day_price: undefined,
      holiday_day_shift_price: undefined,
      holiday_night_shift_price: undefined,
      holiday_full_day_price: undefined,
      day_shift_start_time: '09:00',
      day_shift_end_time: '16:30',
      night_shift_start_time: '17:30',
      night_shift_end_time: '08:30',
    },
  });

  useEffect(() => {
    if (roomType) {
      // Ensure amenities is always an array
      const amenitiesValue = Array.isArray(roomType.amenities) ? roomType.amenities : [];
      
      form.reset({
        name: roomType.name,
        base_price: Number(roomType.base_price),
        weekend_price: roomType.weekend_price ? Number(roomType.weekend_price) : undefined,
        max_occupancy: roomType.max_occupancy,
        min_occupancy: roomType.min_occupancy || 1,
        max_adults: roomType.max_adults || roomType.max_occupancy,
        max_children: roomType.max_children || 0,
        standard_adults_occupancy: (roomType as any).standard_adults_occupancy || (roomType as any).standard_occupancy || 2,
        standard_children_occupancy: (roomType as any).standard_children_occupancy || 0,
        extra_adult_charge: Number(roomType.extra_adult_charge || 0),
        extra_child_charge: Number(roomType.extra_child_charge || 0),
        extra_single_bed_charge: (roomType as any).extra_single_bed_charge ? Number((roomType as any).extra_single_bed_charge) : undefined,
        extra_double_bed_charge: (roomType as any).extra_double_bed_charge ? Number((roomType as any).extra_double_bed_charge) : undefined,
        size_sqm: roomType.size_sqm ? Number(roomType.size_sqm) : undefined,
        min_stay_nights: roomType.min_stay_nights ? Number(roomType.min_stay_nights) : undefined,
        max_stay_nights: roomType.max_stay_nights ? Number(roomType.max_stay_nights) : undefined,
        description: roomType.description || '',
        amenities: amenitiesValue,
        is_active: roomType.is_active,
        // Shift pricing fields
        pricing_mode: (roomType as any).pricing_mode || 'traditional',
        day_shift_price: (roomType as any).day_shift_price ? Number((roomType as any).day_shift_price) : 0,
        night_shift_price: (roomType as any).night_shift_price ? Number((roomType as any).night_shift_price) : 0,
        full_day_price: (roomType as any).full_day_price ? Number((roomType as any).full_day_price) : 0,
        weekend_day_shift_price: (roomType as any).weekend_day_shift_price ? Number((roomType as any).weekend_day_shift_price) : undefined,
        weekend_night_shift_price: (roomType as any).weekend_night_shift_price ? Number((roomType as any).weekend_night_shift_price) : undefined,
        weekend_full_day_price: (roomType as any).weekend_full_day_price ? Number((roomType as any).weekend_full_day_price) : undefined,
        holiday_day_shift_price: (roomType as any).holiday_day_shift_price ? Number((roomType as any).holiday_day_shift_price) : undefined,
        holiday_night_shift_price: (roomType as any).holiday_night_shift_price ? Number((roomType as any).holiday_night_shift_price) : undefined,
        holiday_full_day_price: (roomType as any).holiday_full_day_price ? Number((roomType as any).holiday_full_day_price) : undefined,
        day_shift_start_time: (roomType as any).day_shift_start_time || '09:00',
        day_shift_end_time: (roomType as any).day_shift_end_time || '16:30',
        night_shift_start_time: (roomType as any).night_shift_start_time || '17:30',
        night_shift_end_time: (roomType as any).night_shift_end_time || '08:30',
        cleaning_time_minutes: (roomType as any).cleaning_time_minutes || 30,
      });
      
      // Manually set amenities to ensure it's always an array
      form.setValue('amenities', amenitiesValue);
    } else {
      form.reset();
      // Ensure amenities is set to an empty array after reset
      form.setValue('amenities', []);
      // Set default cleaning time
      form.setValue('cleaning_time_minutes', 30);
    }
  }, [roomType, form]);

  const handleSubmit = async (values: RoomTypeFormValues) => {
    try {
      // Ensure amenities is always an array
      const submissionValues = {
        ...values,
        amenities: Array.isArray(values.amenities) ? values.amenities : []
      };
      console.log('Submitting room type form with values:', submissionValues);
      await onSubmit(submissionValues);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      // Don't close the dialog on error so user can see what went wrong
    }
  };

  // Calculate time gap between shifts
  const calculateShiftGap = (endTime: string, startTime: string): number => {
    // Parse times (format: HH:MM)
    const [endHour, endMin] = endTime.split(':').map(Number);
    const [startHour, startMin] = startTime.split(':').map(Number);
    
    // Convert to minutes
    let endMinutes = endHour * 60 + endMin;
    let startMinutes = startHour * 60 + startMin;
    
    // If night shift ends next day (e.g., ends at 08:30, day starts at 09:00)
    if (startMinutes < endMinutes) {
      // This means the end time is actually on the next day
      startMinutes += 24 * 60; // Add 24 hours
    }
    
    return startMinutes - endMinutes;
  };

  // Check if cleaning time is valid for current shift configuration
  const validateCleaningTime = (): { isValid: boolean; message?: string } => {
    const pricingMode = form.watch('pricing_mode');
    
    if (pricingMode !== 'shift') {
      return { isValid: true }; // No validation needed for traditional pricing
    }
    
    const cleaningTime = form.watch('cleaning_time_minutes') || 30;
    const dayShiftEnd = form.watch('day_shift_end_time') || '16:30';
    const nightShiftStart = form.watch('night_shift_start_time') || '17:30';
    const nightShiftEnd = form.watch('night_shift_end_time') || '08:30';
    const dayShiftStart = form.watch('day_shift_start_time') || '09:00';
    
    // Calculate gaps
    const dayToNightGap = calculateShiftGap(dayShiftEnd, nightShiftStart);
    const nightToDayGap = calculateShiftGap(nightShiftEnd, dayShiftStart);
    
    const minGap = Math.min(dayToNightGap, nightToDayGap);
    
    if (cleaningTime > minGap) {
      return {
        isValid: false,
        message: t('roomTypes.cleaningTimeExceedsGap', { 
          cleaningTime, 
          minGap,
          gap: minGap === dayToNightGap ? t('roomTypes.dayToNightShift') : t('roomTypes.nightToDayShift')
        })
      };
    }
    
    return { isValid: true };
  };

  const cleaningTimeValidation = validateCleaningTime();

  // Debug: Log form state and errors, and fix amenities if needed
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      // Fix amenities if it's not an array
      if (value.amenities && !Array.isArray(value.amenities)) {
        console.log('Fixing amenities - was:', value.amenities);
        form.setValue('amenities', [], { shouldValidate: false });
      }
      
      const errors = form.formState.errors;
      if (Object.keys(errors).length > 0) {
        console.log('Form validation errors:', errors);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
          <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
            console.error('Form validation failed:', errors);
            // Show first error message to user
            const firstError = Object.values(errors)[0];
            if (firstError && 'message' in firstError) {
              alert(`Validation error: ${firstError.message}`);
            }
          })} className="space-y-4">
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

            {/* Shift-based Pricing Configuration */}
            <ShiftPricingConfig
              form={form}
              pricingMode={form.watch('pricing_mode') || 'traditional'}
              dayShiftPrice={form.watch('day_shift_price') || 0}
              nightShiftPrice={form.watch('night_shift_price') || 0}
              fullDayPrice={form.watch('full_day_price') || 0}
              weekendDayShiftPrice={form.watch('weekend_day_shift_price')}
              weekendNightShiftPrice={form.watch('weekend_night_shift_price')}
              weekendFullDayPrice={form.watch('weekend_full_day_price')}
              holidayDayShiftPrice={form.watch('holiday_day_shift_price')}
              holidayNightShiftPrice={form.watch('holiday_night_shift_price')}
              holidayFullDayPrice={form.watch('holiday_full_day_price')}
              dayShiftStartTime={form.watch('day_shift_start_time')}
              dayShiftEndTime={form.watch('day_shift_end_time')}
              nightShiftStartTime={form.watch('night_shift_start_time')}
              nightShiftEndTime={form.watch('night_shift_end_time')}
              onPricingModeChange={(mode) => form.setValue('pricing_mode', mode, { shouldValidate: true })}
              onPriceChange={(field, value) => form.setValue(field as any, value, { shouldValidate: true })}
              onTimeChange={(field, value) => form.setValue(field as any, value, { shouldValidate: true })}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="standard_adults_occupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.standardAdultsOccupancy')} *</FormLabel>
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
                      {t('roomTypes.standardAdultsDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="standard_children_occupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.standardChildrenOccupancy')} *</FormLabel>
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
                      {t('roomTypes.standardChildrenDescription')}
                    </FormDescription>
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
                      {t('roomTypes.maxAdultsDescription')}
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
                      {t('roomTypes.maxChildrenDescription')}
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
                      {t('roomTypes.extraAdultChargeDescription')}
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
                      {t('roomTypes.extraChildChargeDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="extra_single_bed_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.extraSingleBedCharge')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('roomTypes.extraSingleBedDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extra_double_bed_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roomTypes.extraDoubleBedCharge')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('roomTypes.extraDoubleBedDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cleaning_time_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={!cleaningTimeValidation.isValid ? 'text-red-500' : ''}>
                    {t('roomTypes.cleaningTime')}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="240"
                      {...field} 
                      value={field.value || 30}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      placeholder="30"
                      className={!cleaningTimeValidation.isValid ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                  </FormControl>
                  <FormDescription className={!cleaningTimeValidation.isValid ? 'text-red-500' : ''}>
                    {!cleaningTimeValidation.isValid 
                      ? cleaningTimeValidation.message 
                      : t('roomTypes.cleaningTimeDescription')}
                  </FormDescription>
                  {form.watch('pricing_mode') === 'shift' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('roomTypes.shiftGaps', {
                        dayToNight: calculateShiftGap(
                          form.watch('day_shift_end_time') || '16:30',
                          form.watch('night_shift_start_time') || '17:30'
                        ),
                        nightToDay: calculateShiftGap(
                          form.watch('night_shift_end_time') || '08:30',
                          form.watch('day_shift_start_time') || '09:00'
                        )
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      {t('roomTypes.minStayNightsDescription')}
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
                      {t('roomTypes.maxStayNightsDescription')}
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
                        {t('roomTypes.activeDescription')}
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
              <Button 
                type="submit" 
                disabled={loading}
                onClick={() => {
                  console.log('Save button clicked');
                  console.log('Form state:', form.formState);
                  console.log('Form errors:', form.formState.errors);
                  console.log('Form isValid:', form.formState.isValid);
                }}
              >
                {loading ? t('common.loading') : roomType ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};