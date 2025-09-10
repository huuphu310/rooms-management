import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Grid3x3, List } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { RoomList } from '@/components/rooms/RoomList'
import { RoomForm } from '@/components/rooms/RoomForm'
import { RoomGridView } from '@/components/rooms/RoomGridView'
import { roomsApi, type Room, type RoomCreate } from '@/lib/api/rooms'
import { useQueryClient } from '@tanstack/react-query'

export default function Rooms() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleCreateRoom = async (data: RoomCreate) => {
    try {
      await roomsApi.create(data)
      toast({
        title: t('success'),
        description: t('roomCreatedSuccessfully'),
      })
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.response?.data?.detail || t('failedToCreateRoom'),
        variant: 'destructive',
      })
    }
  }

  const handleUpdateRoom = async (data: any) => {
    if (!selectedRoom) return
    
    try {
      await roomsApi.update(selectedRoom.id, data)
      toast({
        title: t('success'),
        description: t('roomUpdatedSuccessfully'),
      })
      setIsEditDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.response?.data?.detail || t('failedToUpdateRoom'),
        variant: 'destructive',
      })
    }
  }

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room)
    setIsEditDialogOpen(true)
  }

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(t('confirmDeleteRoom'))) return
    
    try {
      await roomsApi.delete(room.id)
      toast({
        title: t('success'),
        description: t('roomDeletedSuccessfully'),
      })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.response?.data?.detail || t('failedToDeleteRoom'),
        variant: 'destructive',
      })
    }
  }

  const handleAssignBooking = (room: Room) => {
    // Open a dialog to select and assign a booking to this room
    toast({
      title: t('info'),
      description: t('assignBookingFeatureComingSoon'),
    })
  }

  const handleCheckIn = async (room: Room) => {
    // Navigate to the booking check-in
    toast({
      title: t('info'),
      description: t('navigateToBookingForCheckIn'),
    })
  }

  const handleCheckOut = async (room: Room) => {
    // Navigate to the booking check-out
    toast({
      title: t('info'),
      description: t('navigateToBookingForCheckOut'),
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('rooms.roomManagement')}</h1>
          <p className="text-gray-600 mt-1">{t('rooms.manageYourRooms')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('rooms.newRoom')}
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
        <TabsList className="mb-4">
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            {t('gridView')}
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t('listView')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <RoomGridView
            onAssignBooking={handleAssignBooking}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onEditRoom={handleEditRoom}
          />
        </TabsContent>

        <TabsContent value="list">
          <RoomList
            onEditRoom={handleEditRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </TabsContent>
      </Tabs>

      {/* Create Room Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('rooms.createNewRoom')}</DialogTitle>
            <DialogDescription>
              {t('rooms.fillInTheFormBelowToCreateANewRoom')}
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            onSubmit={handleCreateRoom}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      {selectedRoom && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('rooms.editRoom')}</DialogTitle>
              <DialogDescription>
                {t('rooms.updateRoomInformation')}
              </DialogDescription>
            </DialogHeader>
            <RoomForm
              room={selectedRoom}
              onSubmit={handleUpdateRoom}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}