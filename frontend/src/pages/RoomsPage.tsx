import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, RefreshCw, LayoutGrid, List, Building2 } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { RoomTable } from '@/components/rooms/RoomTable';
import { RoomCard } from '@/components/rooms/RoomCard';
import { RoomForm } from '@/components/rooms/RoomForm';
import { RoomDetailModal } from '@/components/rooms/RoomDetailModal';
import { RoomStatusModal } from '@/components/rooms/RoomStatusModal';
import roomService, { type Room, type RoomFilters } from '@/services/roomService';
import buildingService from '@/services/buildingService';

export const RoomsPage: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [filters, setFilters] = useState<RoomFilters>({
    page: 1,
    limit: 100,
    search: '',
    status: '',
    floor: undefined,
    room_type_id: '',
  });

  // Fetch buildings
  const { data: buildingsData } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingService.getBuildings({ limit: 100 }),
  });

  // Fetch room types
  const { data: roomTypesData } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: () => roomService.getRoomTypes(),
  });

  // Fetch rooms - include building filter
  const { data: roomsData, isLoading, refetch } = useQuery({
    queryKey: ['rooms', filters, selectedBuilding],
    queryFn: () => roomService.getRooms({
      ...filters,
      building: selectedBuilding === 'all' ? undefined : selectedBuilding,
    }),
  });

  // Create room mutation
  const createMutation = useMutation({
    mutationFn: roomService.createRoom,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('rooms.roomCreatedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormOpen(false);
    },
    onError: (error: any) => {
      // Get the error message from the backend
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.detail || 
                          t('rooms.failedToCreateRoom');
      
      toast({
        title: t('common.error'),
        description: errorMessage,
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
        title: t('common.success'),
        description: t('rooms.roomUpdatedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormOpen(false);
      setSelectedRoom(null);
    },
    onError: (error: any) => {
      // Get the error message from the backend
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.detail || 
                          t('rooms.failedToUpdateRoom');
      
      toast({
        title: t('common.error'),
        description: errorMessage,
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
        title: t('common.success'),
        description: t('rooms.roomStatusUpdated'),
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setStatusOpen(false);
      setSelectedRoom(null);
    },
    onError: (error: any) => {
      // Get the error message from the backend
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.detail || 
                          t('rooms.failedToUpdateRoomStatus');
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Delete room mutation
  const deleteMutation = useMutation({
    mutationFn: roomService.deleteRoom,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('rooms.roomDeletedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      // Get the error message from the backend
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.detail || 
                          t('rooms.failedToDeleteRoom');
      
      toast({
        title: t('common.error'),
        description: errorMessage,
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
  const buildingsList = buildingsData?.data || [];

  // Group rooms by building and floor
  const roomsByBuildingAndFloor = rooms.reduce((acc, room) => {
    const building = room.building || 'Tòa chính';
    const floor = room.floor || 1;
    
    if (!acc[building]) {
      acc[building] = {};
    }
    if (!acc[building][floor]) {
      acc[building][floor] = [];
    }
    acc[building][floor].push(room);
    return acc;
  }, {} as Record<string, Record<number, Room[]>>);

  // Get building names from fetched data
  const buildings = buildingsList.map(b => b.name).sort();
  
  // Get floors for selected building
  const floorsInBuilding = selectedBuilding === 'all'
    ? Array.from(new Set(rooms.map(r => r.floor || 1))).sort((a, b) => a - b)
    : Object.keys(roomsByBuildingAndFloor[selectedBuilding] || {}).map(Number).sort((a, b) => a - b);

  // Filter rooms by selected building and floor
  const displayedRooms = rooms.filter(room => {
    const buildingMatch = selectedBuilding === 'all' || (room.building || 'Tòa chính') === selectedBuilding;
    const floorMatch = selectedFloor === 'all' || room.floor === selectedFloor;
    return buildingMatch && floorMatch;
  });

  // Statistics
  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    booked: rooms.filter(r => r.status === 'booked').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    blocked: rooms.filter(r => r.status === 'blocked').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('rooms.roomManagement')}</h1>
          <p className="text-muted-foreground">
            {t('rooms.manageYourRooms')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            title={viewMode === 'grid' ? t('common.tableMode') : t('common.gridMode')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t('rooms.newRoom')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.totalRooms')}</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.availableRooms')}</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.bookedRooms')}</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.booked}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.occupiedRooms')}</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.occupied}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.cleaningRooms')}</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.cleaning}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.maintenanceRooms')}</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.maintenance}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('rooms.blockedRooms')}</CardDescription>
            <CardTitle className="text-2xl text-gray-600">{stats.blocked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('rooms.searchRoomNumber')}
                className="pl-10"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <Select
              value={selectedBuilding}
              onValueChange={(value) => {
                setSelectedBuilding(value);
                setSelectedFloor('all');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('rooms.allBuildings')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('rooms.allBuildings')}</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building} value={building}>
                    {building}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('rooms.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="available">{t('rooms.available')}</SelectItem>
                <SelectItem value="booked">{t('rooms.booked')}</SelectItem>
                <SelectItem value="occupied">{t('rooms.occupied')}</SelectItem>
                <SelectItem value="cleaning">{t('rooms.cleaning')}</SelectItem>
                <SelectItem value="maintenance">{t('rooms.maintenance')}</SelectItem>
                <SelectItem value="blocked">{t('rooms.blocked')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.room_type_id || 'all'}
              onValueChange={(value) => handleFilterChange('room_type_id', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('rooms.allRoomTypes')} />
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

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Building and Floor Selection (for grid view) */}
      {viewMode === 'grid' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('rooms.selectBuildingAndFloor')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Building Selection */}
            {buildings.length > 1 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('rooms.building')}:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedBuilding === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedBuilding('all');
                      setSelectedFloor('all');
                    }}
                  >
                    {t('rooms.allBuildings')} ({rooms.length} {t('rooms.rooms')})
                  </Button>
                  {buildings.map((building) => {
                    const buildingRooms = Object.values(roomsByBuildingAndFloor[building] || {}).flat();
                    const availableCount = buildingRooms.filter(r => r.status === 'available').length;
                    return (
                      <Button
                        key={building}
                        variant={selectedBuilding === building ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedBuilding(building);
                          setSelectedFloor('all');
                        }}
                      >
                        {building} ({buildingRooms.length} {t('rooms.rooms')}, {availableCount} {t('rooms.available')})
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Floor Selection */}
            <div>
              <p className="text-sm font-medium mb-2">{t('rooms.floor')}:</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedFloor === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFloor('all')}
                >
                  {t('rooms.allFloors')} ({displayedRooms.filter(r => selectedBuilding === 'all' || (r.building || t('rooms.mainBuilding')) === selectedBuilding).length} {t('rooms.rooms')})
                </Button>
                {floorsInBuilding.map((floor) => {
                  const floorRooms = selectedBuilding === 'all'
                    ? rooms.filter(r => r.floor === floor)
                    : (roomsByBuildingAndFloor[selectedBuilding]?.[floor] || []);
                  const availableCount = floorRooms.filter(r => r.status === 'available').length;
                  return (
                    <Button
                      key={floor}
                      variant={selectedFloor === floor ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFloor(floor)}
                    >
                      {t('rooms.floorLabel')} {floor} ({floorRooms.length} {t('rooms.rooms')}, {availableCount} {t('rooms.available')})
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Display - Grid or Table */}
      {viewMode === 'grid' ? (
        <div>
          {selectedBuilding === 'all' && selectedFloor === 'all' ? (
            // Show all buildings and floors
            buildings.map((building) => (
              <div key={building} className="mb-10">
                <h2 className="text-xl font-bold mb-6 pb-2 border-b flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {building}
                </h2>
                {Object.keys(roomsByBuildingAndFloor[building] || {})
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((floor) => (
                    <div key={`${building}-${floor}`} className="mb-8">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Tầng {floor}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({roomsByBuildingAndFloor[building][floor]?.length || 0} {t('rooms.rooms')})
                        </span>
                      </h3>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {roomsByBuildingAndFloor[building][floor]?.map((room) => (
                          <RoomCard
                            key={room.id}
                            room={room}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onView={handleView}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))
          ) : selectedBuilding !== 'all' && selectedFloor === 'all' ? (
            // Show all floors in selected building
            <div>
              <h2 className="text-xl font-bold mb-6 pb-2 border-b flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {selectedBuilding}
              </h2>
              {Object.keys(roomsByBuildingAndFloor[selectedBuilding] || {})
                .map(Number)
                .sort((a, b) => a - b)
                .map((floor) => (
                  <div key={floor} className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      {t('rooms.floorLabel')} {floor}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({roomsByBuildingAndFloor[selectedBuilding][floor]?.length || 0} {t('rooms.rooms')})
                      </span>
                    </h3>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {roomsByBuildingAndFloor[selectedBuilding][floor]?.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onView={handleView}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Show selected building and floor
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedBuilding === 'all' ? t('rooms.allBuildings') : selectedBuilding} - {t('rooms.floorLabel')} {selectedFloor}
                <span className="text-sm font-normal text-muted-foreground">
                  ({displayedRooms.length} {t('rooms.rooms')})
                </span>
              </h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {displayedRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <RoomTable
              rooms={displayedRooms}
              loading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('common.showing')} {((pagination.page - 1) * pagination.limit) + 1} - {' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {' '}
            {pagination.total} {t('rooms.rooms')}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              {t('common.previous')}
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
              {t('common.next')}
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