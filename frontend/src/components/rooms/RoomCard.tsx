import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Settings, 
  Trash,
  Users,
  DollarSign,
  Bed,
  Home
} from 'lucide-react';
import type { Room } from '@/services/roomService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';

interface RoomCardProps {
  room: Room;
  onView: (room: Room) => void;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onStatusChange: (room: Room) => void;
}

const statusColors = {
  available: 'bg-green-500',
  booked: 'bg-blue-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  blocked: 'bg-gray-500',
};

// Status labels will be handled by translations

const statusIcons = {
  available: '🟢',
  booked: '🔵',
  occupied: '🛏️',
  cleaning: '🧹',
  maintenance: '🔧',
  blocked: '🔒',
};

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const { t, language } = useLanguage();
  const { formatCurrency, convertFromVND, setCurrency } = useCurrency();
  
  const isAvailable = room.status === 'available';
  const isOccupied = room.status === 'occupied';
  const isBooked = room.status === 'booked';
  
  // Set currency based on language
  useEffect(() => {
    if (language === 'en') {
      setCurrency('USD');
    } else {
      setCurrency('VND');
    }
  }, [language, setCurrency]);
  
  // Get translated status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t('rooms.statusAvailable');
      case 'booked': return t('rooms.statusReserved');
      case 'occupied': return t('rooms.statusOccupied');
      case 'cleaning': return t('rooms.statusCleaning');
      case 'maintenance': return t('rooms.statusMaintenance');
      case 'blocked': return t('rooms.statusBlocked');
      default: return status;
    }
  };
  
  // Format price based on language/currency
  const formatPrice = (price: number) => {
    if (language === 'en') {
      const convertedPrice = convertFromVND(price, 'USD');
      return formatCurrency(convertedPrice, 'USD');
    } else {
      return formatCurrency(price, 'VND');
    }
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
        !room.is_active ? 'opacity-60' : ''
      } ${
        isAvailable ? 'hover:ring-2 hover:ring-green-400' : ''
      }`}
    >
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusColors[room.status]}`} />
      
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{statusIcons[room.status]}</span>
            <div>
              <h3 className="font-semibold text-lg">{t('rooms.roomNumber')} {room.room_number}</h3>
              <p className="text-sm text-muted-foreground">
                {room.building_name && room.building_name !== t('rooms.mainBuilding') && `${room.building_name} - `}
                {t('rooms.floorLabel')} {room.floor || 1}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(room)}>
                <Eye className="mr-2 h-4 w-4" />
                {t('common.view')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(room)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(room)}>
                <Settings className="mr-2 h-4 w-4" />
                {t('rooms.changeStatus')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(room)}
                className="text-destructive"
                disabled={room.status !== 'available'}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('rooms.deleteRoom')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Room Type Badge */}
        <div className="mb-3">
          <Badge variant="outline" className="font-normal">
            <Home className="mr-1 h-3 w-3" />
            {room.room_type?.name || 'N/A'}
          </Badge>
        </div>

        {/* Room Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center">
              <Users className="mr-1 h-3 w-3" />
              {t('rooms.occupancy')}
            </span>
            <span className="font-medium">{room.room_type?.max_occupancy || 0} {language === 'en' ? 'people' : 'người'}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center">
              <DollarSign className="mr-1 h-3 w-3" />
              {t('rooms.pricePerNight')}
            </span>
            <span className="font-medium">
              {room.room_type?.base_price ? formatPrice(room.room_type.base_price) : 'N/A'}
            </span>
          </div>

          {room.room_type?.amenities && room.room_type.amenities.length > 0 && (
            <div className="flex items-center text-sm">
              <span className="text-muted-foreground">{t('rooms.amenities')}:</span>
              <span className="ml-1 text-xs">{room.room_type.amenities.length} {language === 'en' ? 'items' : 'mục'}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            className={`${statusColors[room.status]} text-white border-0`}
          >
            {getStatusLabel(room.status)}
          </Badge>
          
          {!room.is_active && (
            <Badge variant="secondary">
              {language === 'en' ? 'Inactive' : 'Tạm ngưng'}
            </Badge>
          )}
        </div>

        {/* Quick Actions for Available Rooms */}
        {isAvailable && (
          <div className="mt-3 pt-3 border-t">
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => onView(room)}
            >
              <Bed className="mr-2 h-4 w-4" />
              {t('rooms.quickBooking')}
            </Button>
          </div>
        )}

        {/* Current Guest Info for Occupied Rooms */}
        {(isOccupied || isBooked) && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {isOccupied ? (language === 'en' ? 'Guest occupied' : 'Khách đang ở') : (language === 'en' ? 'Guest arriving' : 'Khách sắp đến')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};