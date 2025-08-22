import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import type { QuickProduct } from '@/types/pos';
import { formatCurrency } from '@/lib/api/pos';

interface ProductGridProps {
  products: QuickProduct[];
  onAddToCart: (product: QuickProduct, quantity?: number) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Package className="h-12 w-12 mb-4" />
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map((product) => (
        <Card
          key={product.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onAddToCart(product)}
        >
          <div className="p-3">
            {product.image_url && (
              <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
              <p className="text-xs text-gray-500">{product.code}</p>
              
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-600">
                  {formatCurrency(product.price)}
                </span>
                {product.stock_quantity !== undefined && (
                  <Badge 
                    variant={product.stock_quantity > 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {product.stock_quantity > 0 ? `${product.stock_quantity}` : 'Out'}
                  </Badge>
                )}
              </div>
              
              {product.modifiers.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {product.modifiers.length} options
                </Badge>
              )}
            </div>
            
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              disabled={!product.is_available || product.stock_quantity === 0}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}