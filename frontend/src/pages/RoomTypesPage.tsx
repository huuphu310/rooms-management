import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calculator, DollarSign, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RoomTypeForm } from '@/components/rooms/RoomTypeForm';
import { SeasonalPricing } from '@/components/rooms/SeasonalPricing';
import { useLanguage } from '@/contexts/LanguageContext';
import roomService from '@/services/roomService';
import type { RoomType } from '@/services/roomService';

export const RoomTypesPage: React.FC = () => {
  const { t, formatCurrency, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);

  // Fetch room types
  const { data: roomTypesData, isLoading } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: () => roomService.getRoomTypes(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => roomService.createRoomType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      toast({
        title: t('messages.createSuccess'),
        description: t('roomTypes.title'),
      });
      setIsFormOpen(false);
      setSelectedRoomType(null);
    },
    onError: (error: any) => {
      toast({
        title: t('messages.operationFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      roomService.updateRoomType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      toast({
        title: t('messages.updateSuccess'),
        description: t('roomTypes.title'),
      });
      setIsFormOpen(false);
      setSelectedRoomType(null);
    },
    onError: (error: any) => {
      toast({
        title: t('messages.operationFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => roomService.deleteRoomType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      toast({
        title: t('messages.deleteSuccess'),
        description: t('roomTypes.title'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('messages.operationFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    setSelectedRoomType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (roomType: RoomType) => {
    setSelectedRoomType(roomType);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('messages.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = async (data: any) => {
    if (selectedRoomType) {
      await updateMutation.mutateAsync({ id: selectedRoomType.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const roomTypes = roomTypesData?.data || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Room Types Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('roomTypes.title')}</CardTitle>
              <CardDescription>{t('roomTypes.subtitle')}</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('roomTypes.addRoomType')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : roomTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('messages.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('roomTypes.typeName')}</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>{t('roomTypes.basePrice')}</TableHead>
                  <TableHead>{t('roomTypes.pricingMode')}</TableHead>
                  <TableHead>Weekend/Holiday</TableHead>
                  <TableHead>{t('roomTypes.occupancyDetails')}</TableHead>
                  <TableHead>{t('roomTypes.extraCharges')}</TableHead>
                  <TableHead>Size (m²)</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes.map((roomType) => (
                  <TableRow key={roomType.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{roomType.name}</div>
                        {roomType.short_description && (
                          <div className="text-xs text-muted-foreground">{roomType.short_description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roomType.code || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(roomType.base_price))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(roomType as any).pricing_mode === 'shift' ? (
                          <>
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">{t('roomTypes.shiftPricing')}</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{t('roomTypes.traditionalPricing')}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {roomType.weekend_price && (
                          <div className="text-sm">
                            WE: {formatCurrency(Number(roomType.weekend_price))}
                          </div>
                        )}
                        {roomType.holiday_price && (
                          <div className="text-sm">
                            HD: {formatCurrency(Number(roomType.holiday_price))}
                          </div>
                        )}
                        {!roomType.weekend_price && !roomType.holiday_price && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>Std: {roomType.standard_occupancy || 2}</div>
                        <div>Min-Max: {roomType.min_occupancy || 1}-{roomType.max_occupancy}</div>
                        <div className="text-muted-foreground">
                          Adults: {roomType.max_adults || roomType.max_occupancy}, Children: {roomType.max_children || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {(roomType.extra_adult_charge && roomType.extra_adult_charge > 0) && (
                          <div>Adult: {formatCurrency(Number(roomType.extra_adult_charge))}</div>
                        )}
                        {(roomType.extra_child_charge && roomType.extra_child_charge > 0) && (
                          <div>Child: {formatCurrency(Number(roomType.extra_child_charge))}</div>
                        )}
                        {(!roomType.extra_adult_charge || roomType.extra_adult_charge === 0) && 
                         (!roomType.extra_child_charge || roomType.extra_child_charge === 0) && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {roomType.size_sqm_from || roomType.size_sqm_to ? (
                        <div className="text-sm">
                          {roomType.size_sqm_from && roomType.size_sqm_to 
                            ? `${roomType.size_sqm_from}-${roomType.size_sqm_to}`
                            : roomType.size_sqm_from || roomType.size_sqm_to}
                        </div>
                      ) : roomType.size_sqm ? (
                        `${roomType.size_sqm}`
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roomType.is_active ? 'default' : 'secondary'}>
                        {roomType.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(roomType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(roomType.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Pricing Management */}
      <SeasonalPricing roomTypes={roomTypes} />

      <RoomTypeForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedRoomType(null);
        }}
        onSubmit={handleSubmit}
        roomType={selectedRoomType}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};