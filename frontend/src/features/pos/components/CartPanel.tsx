import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import type { QuickProduct } from '@/types/pos';
import { formatCurrency } from '@/lib/api/pos';

interface CartItem {
  product: QuickProduct;
  quantity: number;
  modifiers: any[];
  notes?: string;
}

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export default function CartPanel({ items, onUpdateQuantity, onRemoveItem }: CartPanelProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <ShoppingCart className="h-12 w-12 mb-4" />
        <p>Cart is empty</p>
        <p className="text-sm mt-2">Add items to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const itemTotal = item.quantity * item.product.price;
        const modifierTotal = item.modifiers.reduce((sum, mod) => {
          return sum + (mod.price_adjustment || 0) * item.quantity;
        }, 0);
        const total = itemTotal + modifierTotal;

        return (
          <Card key={item.product.id} className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.product.name}</h4>
                  <p className="text-xs text-gray-500">{item.product.code}</p>
                  {item.modifiers.length > 0 && (
                    <div className="mt-1">
                      {item.modifiers.map((mod, idx) => (
                        <p key={idx} className="text-xs text-gray-600">
                          + {mod.modifier_name} ({formatCurrency(mod.price_adjustment)})
                        </p>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-600 italic mt-1">{item.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    @ {formatCurrency(item.product.price)}
                  </p>
                  <p className="font-bold text-sm">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}