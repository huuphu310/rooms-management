import { Button } from '@/components/ui/button';
import {
  Calculator,
  Percent,
  Gift,
  Users,
  Search,
  RefreshCw,
  Receipt,
  Package
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
    { id: 'return', label: 'Return', icon: RefreshCw, color: 'text-orange-600' },
    { id: 'receipt', label: 'Receipt', icon: Receipt, color: 'text-indigo-600' },
    { id: 'products', label: 'Products', icon: Package, color: 'text-pink-600' },
    { id: 'voucher', label: 'Voucher', icon: Gift, color: 'text-red-600' }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.id)}
            className="flex flex-col items-center py-3"
          >
            <Icon className={`h-5 w-5 mb-1 ${action.color}`} />
            <span className="text-xs">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}