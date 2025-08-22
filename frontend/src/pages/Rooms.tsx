import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Bed, Home } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  floor: number;
  status: string;
  room_type: {
    name: string;
    base_price: number;
    max_occupancy: number;
  };
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  const fetchRooms = async () => {
    try {
      let query = supabase
        .from('rooms')
        .select(`
          *,
          room_type:room_types(name, base_price, max_occupancy)
        `);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'cleaning': return 'bg-yellow-500';
      case 'maintenance': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All Rooms' },
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  if (loading) {
    return <div className="p-6">Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Room Management</h2>
          <p className="text-muted-foreground">Manage your hotel rooms and availability</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Room
        </Button>
      </div>

      <div className="flex gap-2">
        {statusFilters.map((statusFilter) => (
          <Button
            key={statusFilter.value}
            variant={filter === statusFilter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(statusFilter.value)}
          >
            {statusFilter.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">Floor {room.floor}</p>
                </div>
                <Badge className={getStatusColor(room.status)}>
                  {room.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Home className="mr-2 h-4 w-4" />
                  {room.room_type?.name}
                </div>
                <div className="flex items-center text-sm">
                  <Bed className="mr-2 h-4 w-4" />
                  Max {room.room_type?.max_occupancy} guests
                </div>
                <div className="text-lg font-semibold">
                  ${room.room_type?.base_price}/night
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}