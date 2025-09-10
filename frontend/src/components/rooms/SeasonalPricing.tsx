import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import type { SeasonalRate, RoomType } from '@/services/roomService';

interface SeasonalPricingProps {
  roomTypeId?: string;
  roomTypes?: RoomType[];
}

export const SeasonalPricing: React.FC<SeasonalPricingProps> = ({ roomTypeId, roomTypes }) => {
  const { t, formatCurrency } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SeasonalRate | null>(null);
  const [formData, setFormData] = useState<Partial<SeasonalRate>>({
    season_type: 'high',
    rate_type: 'multiplier',
    rate_multiplier: 1.2,
    min_stay_nights: 1,
    applicable_days: '1111111',
    priority: 0,
    is_active: true,
  });

  // Fetch seasonal rates
  const { data: rates, isLoading } = useQuery({
    queryKey: ['seasonal-rates', roomTypeId],
    queryFn: async () => {
      const params = roomTypeId ? { room_type_id: roomTypeId } : {};
      const response = await api.get('/pricing/seasonal-rates', { params });
      return response.data.seasonal_rates as SeasonalRate[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<SeasonalRate>) => {
      const response = await api.post('/pricing/seasonal-rates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-rates'] });
      toast({
        title: 'Success',
        description: 'Seasonal rate created successfully',
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create seasonal rate',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SeasonalRate> }) => {
      const response = await api.put(`/pricing/seasonal-rates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-rates'] });
      toast({
        title: 'Success',
        description: 'Seasonal rate updated successfully',
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update seasonal rate',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/pricing/seasonal-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-rates'] });
      toast({
        title: 'Success',
        description: 'Seasonal rate deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete seasonal rate',
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (rate?: SeasonalRate) => {
    if (rate) {
      setSelectedRate(rate);
      setFormData(rate);
    } else {
      setSelectedRate(null);
      setFormData({
        room_type_id: roomTypeId,
        season_type: 'high',
        rate_type: 'multiplier',
        rate_multiplier: 1.2,
        min_stay_nights: 1,
        applicable_days: '1111111',
        priority: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRate(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRate) {
      await updateMutation.mutateAsync({ id: selectedRate.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this seasonal rate?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getSeasonTypeIcon = (type: string) => {
    switch (type) {
      case 'high':
        return <TrendingUp className="h-4 w-4" />;
      case 'low':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSeasonTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      high: 'default',
      low: 'secondary',
      special_event: 'destructive',
    };
    return (
      <Badge variant={variants[type] || 'outline'}>
        <span className="flex items-center gap-1">
          {getSeasonTypeIcon(type)}
          {type.replace('_', ' ').toUpperCase()}
        </span>
      </Badge>
    );
  };

  const formatRateAdjustment = (rate: SeasonalRate) => {
    if (rate.rate_type === 'multiplier' && rate.rate_multiplier) {
      const percentage = ((rate.rate_multiplier - 1) * 100).toFixed(0);
      return `${percentage > 0 ? '+' : ''}${percentage}%`;
    }
    if (rate.rate_type === 'fixed' && rate.fixed_rate) {
      return formatCurrency(rate.fixed_rate);
    }
    if (rate.rate_type === 'addition' && rate.rate_addition) {
      return `+${formatCurrency(rate.rate_addition)}`;
    }
    return '-';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('roomTypes.seasonalPricing')}</CardTitle>
            <CardDescription>{t('roomTypes.manageSeasonalRateAdjustments')}</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
{t('roomTypes.addSeasonalRate')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !rates || rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No seasonal rates configured
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roomTypes.seasonName')}</TableHead>
                <TableHead>{t('roomTypes.seasonType')}</TableHead>
                <TableHead>{t('roomTypes.period')}</TableHead>
                <TableHead>{t('roomTypes.adjustment')}</TableHead>
                <TableHead>{t('roomTypes.minStay')}</TableHead>
                <TableHead>{t('roomTypes.days')}</TableHead>
                <TableHead>{t('roomTypes.priority')}</TableHead>
                <TableHead>{t('roomTypes.status')}</TableHead>
                <TableHead className="text-right">{t('roomTypes.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.season_name}</TableCell>
                  <TableCell>{getSeasonTypeBadge(rate.season_type)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(rate.start_date).toLocaleDateString()} -
                      <br />
                      {new Date(rate.end_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatRateAdjustment(rate)}</Badge>
                  </TableCell>
                  <TableCell>{rate.min_stay_nights || 1} nights</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {rate.applicable_days?.split('').map((day, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded text-xs flex items-center justify-center ${
                            day === '1' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{rate.priority || 0}</TableCell>
                  <TableCell>
                    <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                      {rate.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(rate)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rate.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
{selectedRate ? t('roomTypes.editSeasonalRate') : t('roomTypes.addSeasonalRate')}
              </DialogTitle>
              <DialogDescription>
{t('roomTypes.configureSeasonalPricingAdjustments')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="season_name">{t('roomTypes.seasonName')}</Label>
                  <Input
                    id="season_name"
                    value={formData.season_name || ''}
                    onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="season_type">{t('roomTypes.seasonType')}</Label>
                  <Select
                    value={formData.season_type}
                    onValueChange={(value) => setFormData({ ...formData, season_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('roomTypes.highSeason')}</SelectItem>
                      <SelectItem value="low">{t('roomTypes.lowSeason')}</SelectItem>
                      <SelectItem value="special_event">{t('roomTypes.specialEvent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!roomTypeId && roomTypes && (
                <div>
                  <Label htmlFor="room_type_id">{t('roomTypes.roomType')}</Label>
                  <Select
                    value={formData.room_type_id}
                    onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('roomTypes.selectRoomType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">{t('roomTypes.startDate')}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">{t('roomTypes.endDate')}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate_type">{t('roomTypes.rateType')}</Label>
                  <Select
                    value={formData.rate_type}
                    onValueChange={(value) => setFormData({ ...formData, rate_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiplier">{t('roomTypes.multiplierPercent')}</SelectItem>
                      <SelectItem value="fixed">{t('roomTypes.fixedRate')}</SelectItem>
                      <SelectItem value="addition">{t('roomTypes.additionAmount')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rate_value">
                    {formData.rate_type === 'multiplier'
                      ? t('roomTypes.multiplierExample')
                      : formData.rate_type === 'fixed'
                      ? t('roomTypes.fixedRate')
                      : t('roomTypes.additionAmount')}
                  </Label>
                  <Input
                    id="rate_value"
                    type="number"
                    step="0.01"
                    value={
                      formData.rate_type === 'multiplier'
                        ? formData.rate_multiplier
                        : formData.rate_type === 'fixed'
                        ? formData.fixed_rate
                        : formData.rate_addition || ''
                    }
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (formData.rate_type === 'multiplier') {
                        setFormData({ ...formData, rate_multiplier: value });
                      } else if (formData.rate_type === 'fixed') {
                        setFormData({ ...formData, fixed_rate: value });
                      } else {
                        setFormData({ ...formData, rate_addition: value });
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_stay_nights">{t('roomTypes.minimumStayNights')}</Label>
                  <Input
                    id="min_stay_nights"
                    type="number"
                    min="1"
                    value={formData.min_stay_nights || 1}
                    onChange={(e) => setFormData({ ...formData, min_stay_nights: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">{t('roomTypes.priorityHigherMoreImportant')}</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority || 0}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedRate ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
