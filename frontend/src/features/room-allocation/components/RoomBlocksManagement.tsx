import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { roomAllocationApi } from '@/lib/api/room-allocation'
import roomService from '@/services/roomService'
import type { RoomBlock } from '@/types/room-allocation'
import { Calendar, Plus, Settings, AlertTriangle } from 'lucide-react'
import CreateRoomBlockModal from './CreateRoomBlockModal'

interface RoomBlocksManagementProps {
  onBlockCreated?: () => void
}

export default function RoomBlocksManagement({ onBlockCreated }: RoomBlocksManagementProps) {
  const [blocks, setBlocks] = useState<RoomBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rooms, setRooms] = useState<any[]>([]) // Store rooms data for display

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load both blocks and rooms data
      const [blocksData, roomsData] = await Promise.all([
        roomAllocationApi.getRoomBlocks({ is_active: true }),
        roomService.getRooms()
      ])
      setBlocks(blocksData)
      setRooms(roomsData.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBlocks = async () => {
    try {
      const data = await roomAllocationApi.getRoomBlocks({ is_active: true })
      setBlocks(data)
    } catch (error) {
      console.error('Failed to load room blocks:', error)
    }
  }

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.room_number : 'Unknown'
  }

  const handleCreateSuccess = () => {
    loadBlocks() // Reload the blocks list
    setShowCreateModal(false)
    if (onBlockCreated) {
      onBlockCreated()
    }
  }

  const handleReleaseBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to release this room block?')) {
      return
    }

    try {
      await roomAllocationApi.releaseRoomBlock(blockId, {
        release_reason: 'Manual release by user'
      })
      loadBlocks() // Reload the blocks list
    } catch (error) {
      console.error('Failed to release room block:', error)
      alert('Failed to release room block. Please try again.')
    }
  }

  const getBlockTypeColor = (blockType: string) => {
    switch (blockType) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-800'
      case 'renovation':
        return 'bg-red-100 text-red-800'
      case 'vip_hold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room blocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Room Blocks Management</h2>
          <p className="text-muted-foreground">
            Manage room blocks for maintenance, VIP holds, and other purposes
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Block
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Active Room Blocks ({blocks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Room Blocks</h3>
              <p className="text-muted-foreground mb-4">
                Create room blocks for maintenance, VIP holds, or special purposes
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Block
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block) => (
                <div key={block.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Room {getRoomNumber(block.room_id)}</span>
                        <Badge className={getBlockTypeColor(block.block_type)}>
                          {block.block_type.replace('_', ' ')}
                        </Badge>
                        {!block.can_override && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Cannot Override
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {new Date(block.start_date).toLocaleDateString()} - {new Date(block.end_date).toLocaleDateString()}
                        </p>
                        {block.block_reason && <p className="mt-1">{block.block_reason}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleReleaseBlock(block.id)}
                      >
                        Release
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Room Block Modal */}
      <CreateRoomBlockModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}