import { Button } from '@/components/ui/button';
import {
  Calculator,
  Percent,
  Gift,
  Users,
  Search,
  Undo2,
  Receipt,
  Package,
  Ticket
} from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    { id: 'discount', label: 'Discount', icon: Percent, color: 'text-green-600' },
    { id: 'calculator', label: 'Calculator', icon: Calculator, color: 'text-blue-600' },
    { id: 'customer', label: 'Customer', icon: Users, color: 'text-purple-600' },
    { id: 'search', label: 'Search', icon: Search, color: 'text-gray-600' },
    { id: 'return', label: 'Return', icon: Undo2, color: 'text-orange-600' },
    { id: 'receipt', label: 'Receipt', icon: Receipt, color: 'text-indigo-600' },
    { id: 'products', label: 'Products', icon: Package, color: 'text-pink-600' },
    { id: 'voucher', label: 'Voucher', icon: Ticket, color: 'text-red-600' }
  ];

  return (
    <div className="grid grid-cols-4 gap-1">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.id)}
            className="flex flex-col items-center justify-center py-2 h-12 min-h-12 text-xs px-1"
          >
            <Icon className={`h-4 w-4 mb-0.5 ${action.color}`} />
            <span className="text-[10px] text-center leading-tight">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}