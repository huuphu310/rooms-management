import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Building2, Phone, User, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import buildingService from '@/services/buildingService';
import type { Building, BuildingCreateInput, BuildingUpdateInput } from '@/services/buildingService';

const buildingSchema = z.object({
  name: z.string().min(1, 'Building name is required / Tên tòa nhà là bắt buộc').max(100),
  code: z.string().max(20).optional(),
  description: z.string().optional(),
  address: z.string().max(500).optional(),
  total_floors: z.number().min(1, 'Number of floors must be >= 1 / Số tầng phải >= 1').max(100),
  has_elevator: z.boolean().optional(),
  has_parking: z.boolean().optional(),
  has_pool: z.boolean().optional(),
  has_gym: z.boolean().optional(),
  has_restaurant: z.boolean().optional(),
  display_order: z.number().optional(),
  is_main_building: z.boolean().optional(),
  reception_phone: z.string().max(20).optional(),
  manager_name: z.string().max(100).optional(),
  manager_phone: z.string().max(20).optional(),
  notes: z.string().optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

export const BuildingSettings: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      address: '',
      total_floors: 1,
      has_elevator: false,
      has_parking: false,
      has_pool: false,
      has_gym: false,
      has_restaurant: false,
      display_order: 0,
      is_main_building: false,
      reception_phone: '',
      manager_name: '',
      manager_phone: '',
      notes: '',
    },
  });

  // Fetch buildings
  const { data: buildingsData, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingService.getBuildings({ limit: 100 }),
  });

  // Create building mutation
  const createMutation = useMutation({
    mutationFn: buildingService.createBuilding,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('buildings.addBuilding') + ' ' + t('common.success').toLowerCase(),
      });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Update building mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BuildingUpdateInput }) =>
      buildingService.updateBuilding(id, data),
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('buildings.editBuilding') + ' ' + t('common.success').toLowerCase(),
      });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setFormOpen(false);
      setSelectedBuilding(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Delete building mutation
  const deleteMutation = useMutation({
    mutationFn: buildingService.deleteBuilding,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('buildings.deleteBuilding') + ' ' + t('common.success').toLowerCase(),
      });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setDeleteDialogOpen(false);
      setSelectedBuilding(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setSelectedBuilding(null);
    form.reset();
    setFormOpen(true);
  };

  const handleEdit = (building: Building) => {
    setSelectedBuilding(building);
    form.reset({
      name: building.name,
      code: building.code || '',
      description: building.description || '',
      address: building.address || '',
      total_floors: building.total_floors,
      has_elevator: building.has_elevator,
      has_parking: building.has_parking,
      has_pool: building.has_pool,
      has_gym: building.has_gym,
      has_restaurant: building.has_restaurant,
      display_order: building.display_order,
      is_main_building: building.is_main_building,
      reception_phone: building.reception_phone || '',
      manager_name: building.manager_name || '',
      manager_phone: building.manager_phone || '',
      notes: building.notes || '',
    });
    setFormOpen(true);
  };

  const handleDelete = (building: Building) => {
    setSelectedBuilding(building);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (values: BuildingFormValues) => {
    const data = {
      ...values,
      code: values.code || undefined,
      description: values.description || undefined,
      address: values.address || undefined,
      reception_phone: values.reception_phone || undefined,
      manager_name: values.manager_name || undefined,
      manager_phone: values.manager_phone || undefined,
      notes: values.notes || undefined,
    };

    if (selectedBuilding) {
      await updateMutation.mutateAsync({ id: selectedBuilding.id, data });
    } else {
      await createMutation.mutateAsync(data as BuildingCreateInput);
    }
  };

  const buildings = buildingsData?.data || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('buildings.title')}</h1>
          <p className="text-muted-foreground">
            {t('buildings.subtitle')}
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('buildings.addBuilding')}
        </Button>
      </div>

      {/* Buildings Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('buildings.buildingListTitle')}</CardTitle>
          <CardDescription>
            {t('buildings.totalBuildingsCount', { count: buildings.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('buildings.buildingName')}</TableHead>
                <TableHead>{t('buildings.buildingCode')}</TableHead>
                <TableHead className="text-center">{t('buildings.totalFloors')}</TableHead>
                <TableHead className="text-center">{t('buildings.totalRooms')}</TableHead>
                <TableHead className="text-center">{t('buildings.facilities')}</TableHead>
                <TableHead>{t('buildings.manager')}</TableHead>
                <TableHead className="text-center">{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {t('buildings.loading')}
                  </TableCell>
                </TableRow>
              ) : buildings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {t('buildings.noBuildings')}
                  </TableCell>
                </TableRow>
              ) : (
                buildings.map((building) => (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium">
                      <div>
                        {building.name}
                        {building.is_main_building && (
                          <Badge className="ml-2" variant="default">
                            {t('buildings.mainBuilding')}
                          </Badge>
                        )}
                      </div>
                      {building.address && (
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {building.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{building.code || '-'}</TableCell>
                    <TableCell className="text-center">{building.total_floors}</TableCell>
                    <TableCell className="text-center">
                      {building.total_rooms || 0}
                      {building.available_rooms !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          ({building.available_rooms} {t('buildings.emptyRooms')})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {building.has_elevator && (
                          <Badge variant="outline" className="text-xs">
                            {t('buildings.hasElevator')}
                          </Badge>
                        )}
                        {building.has_parking && (
                          <Badge variant="outline" className="text-xs">
                            {t('buildings.hasParking')}
                          </Badge>
                        )}
                        {building.has_pool && (
                          <Badge variant="outline" className="text-xs">
                            {t('buildings.hasPool')}
                          </Badge>
                        )}
                        {building.has_gym && (
                          <Badge variant="outline" className="text-xs">
                            {t('buildings.hasGym')}
                          </Badge>
                        )}
                        {building.has_restaurant && (
                          <Badge variant="outline" className="text-xs">
                            {t('buildings.hasRestaurant')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {building.manager_name ? (
                        <div className="space-y-1">
                          <div className="text-sm flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {building.manager_name}
                          </div>
                          {building.manager_phone && (
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {building.manager_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={building.is_active ? 'default' : 'secondary'}>
                        {building.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(building)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(building)}
                          disabled={building.total_rooms && building.total_rooms > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Building Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBuilding ? t('buildings.editBuildingTitle') : t('buildings.addNewBuilding')}
            </DialogTitle>
            <DialogDescription>
              {selectedBuilding
                ? t('buildings.updateBuildingInfo')
                : t('buildings.enterNewBuildingInfo')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildings.buildingName')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('buildings.placeholderBuildingName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildings.buildingCode')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('buildings.placeholderBuildingCode')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('buildings.address')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('buildings.placeholderAddress')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('buildings.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('buildings.placeholderDescription')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_floors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildings.totalFloors')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="100" 
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
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('buildings.displayOrder')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('buildings.displayOrderDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Facilities */}
              <div className="space-y-4">
                <h4 className="font-medium">{t('buildings.facilities')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="has_elevator"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.hasElevator')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="has_parking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.hasParking')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="has_pool"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.hasPool')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="has_gym"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.hasGym')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="has_restaurant"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.hasRestaurant')}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="is_main_building"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('buildings.isMainBuilding')}</FormLabel>
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
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium">{t('buildings.contactInfo')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manager_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('buildings.managerName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('buildings.placeholderManagerName')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manager_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('buildings.managerPhone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('buildings.placeholderManagerPhone')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reception_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('buildings.receptionPhone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('buildings.placeholderReceptionPhone')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('buildings.notes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('buildings.placeholderNotes')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    setSelectedBuilding(null);
                    form.reset();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('buildings.processing')
                    : selectedBuilding
                    ? t('common.update')
                    : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('buildings.confirmDeleteBuilding')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('buildings.confirmDeleteMessage', { name: selectedBuilding?.name })}
              {selectedBuilding?.total_rooms && selectedBuilding.total_rooms > 0 && (
                <div className="mt-2 text-destructive font-medium">
                  {t('buildings.warningHasRooms', { count: selectedBuilding.total_rooms })}
                </div>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                {t('buildings.actionCannotBeUndone')}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedBuilding) {
                  deleteMutation.mutate(selectedBuilding.id);
                }
              }}
              disabled={
                deleteMutation.isPending ||
                (selectedBuilding?.total_rooms && selectedBuilding.total_rooms > 0)
              }
            >
              {deleteMutation.isPending ? t('buildings.processing') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};