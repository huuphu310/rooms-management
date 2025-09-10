import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { posApi, calculateCartTotals, formatCurrency } from '@/lib/api/pos';
import { CustomerType, PaymentMethod } from '@/types/pos';
import type {
  Transaction,
  Shift,
  POSCategory,
  QuickProduct,
  CreateTransactionRequest
} from '@/types/pos';
import {
  ShoppingCart,
  CreditCard,
  Home,
  Users,
  Search,
  Trash2,
  Plus,
  Minus,
  QrCode,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Receipt,
  LogOut,
  Settings,
  BarChart3
} from 'lucide-react';

// Import child components
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';
import PaymentDialog from './components/PaymentDialog';
import ShiftManagement from './components/ShiftManagement';
import TransactionHistory from './components/TransactionHistory';
import QuickActions from './components/QuickActions';

interface CartItem {
  product: QuickProduct;
  quantity: number;
  modifiers: any[];
  notes?: string;
}

export default function POSTerminal() {
  const { t, formatCurrency: formatCurrencyLocale } = useLanguage();
  
  // State management
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerType>(CustomerType.WALK_IN);
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Check for current shift
      try {
        const shift = await posApi.getCurrentShift();
        setCurrentShift(shift);
      } catch (error) {
        // No current shift
        console.log('No active shift');
      }

      // Load categories and products
      const [categoriesData, productsData] = await Promise.all([
        posApi.getCategories({ is_active: true }),
        posApi.getQuickAccessProducts()
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cart management
  const addToCart = (product: QuickProduct, quantity: number = 1) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateCartItemQuantity(product.id, existingItem.quantity + quantity);
    } else {
      setCart([...cart, {
        product,
        quantity,
        modifiers: [],
        notes: ''
      }]);
    }
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setRoomNumber('');
    setSelectedCustomerType(CustomerType.WALK_IN);
  };

  // Transaction creation
  const createTransaction = async () => {
    if (!currentShift) {
      alert('Please open a shift first');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        modifiers: item.modifiers,
        notes: item.notes
      }));

      const request: CreateTransactionRequest = {
        customer_type: selectedCustomerType,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        room_number: roomNumber || undefined,
        items
      };

      const transaction = await posApi.createTransaction(request);
      setActiveTransaction(transaction);
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  };

  // Calculate totals
  const cartTotals = calculateCartTotals(cart);

  // Filter products by category and search
  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading POS Terminal...</p>
        </div>
      </div>
    );
  }

  if (!currentShift) {
    return (
      <ShiftManagement
        onShiftOpened={(shift) => {
          setCurrentShift(shift);
          loadInitialData();
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Compact */}
      <div className="bg-white border-b px-3 py-1.5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">POS Terminal</h1>
            <Badge variant="outline" className="bg-green-50 text-xs">
              Shift: {currentShift.shift_code}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Terminal: {currentShift.terminal_id || 'POS-01'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="text-xs px-2 py-1">
              <Receipt className="mr-1 h-3 w-3" />
              Receipt
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-2 py-1">
              <BarChart3 className="mr-1 h-3 w-3" />
              Reports
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-2 py-1">
              <Settings className="mr-1 h-3 w-3" />
              Settings
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              className="text-xs px-2 py-1"
              onClick={() => {
                // Close shift logic
              }}
            >
              <LogOut className="mr-1 h-3 w-3" />
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Categories & Products */}
        <div className="flex-1 flex flex-col p-2 min-w-0 overflow-hidden">
          {/* Search Bar - Compact */}
          <div className="mb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products by name or code..."
                className="w-full pl-10 pr-4 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories - Compact */}
          <div className="mb-2 flex-shrink-0">
            <div className="flex gap-1 overflow-x-auto pb-1">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className="text-xs px-3 py-1.5"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-3 py-1.5 whitespace-nowrap"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icon && <span className="mr-1">{category.icon}</span>}
                  {category.category_name}
                </Button>
              ))}
            </div>
          </div>

          {/* Product Grid - More precise height calculation */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-2">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={addToCart}
            />
          </div>

          {/* Quick Actions - Compact and always visible */}
          <div className="flex-shrink-0 h-[60px]">
            <QuickActions
              onAction={(action) => {
                console.log('Quick action:', action);
              }}
            />
          </div>
        </div>

        {/* Right Panel - Cart - Compact */}
        <div className={`${cart.length === 0 ? 'w-80' : cart.length > 5 ? 'w-[400px]' : 'w-96'} bg-white border-l flex flex-col transition-all duration-300 flex-shrink-0 max-h-full`}>
          {/* Customer Info - Compact */}
          <div className="p-2 border-b flex-shrink-0">
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <Button
                  variant={selectedCustomerType === CustomerType.WALK_IN ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCustomerType(CustomerType.WALK_IN)}
                  className="flex-1 text-xs px-2 py-1.5"
                >
                  <Users className="mr-1 h-3 w-3" />
                  Walk-in
                </Button>
                <Button
                  variant={selectedCustomerType === CustomerType.GUEST ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCustomerType(CustomerType.GUEST)}
                  className="flex-1 text-xs px-2 py-1.5"
                >
                  <Home className="mr-1 h-3 w-3" />
                  Guest
                </Button>
                <Button
                  variant={selectedCustomerType === CustomerType.STAFF ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCustomerType(CustomerType.STAFF)}
                  className="flex-1 text-xs px-2 py-1.5"
                >
                  Staff
                </Button>
              </div>

              {selectedCustomerType === CustomerType.GUEST && (
                <input
                  type="text"
                  placeholder="Room Number"
                  className="w-full px-2 py-1.5 border rounded text-xs"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              )}

              {selectedCustomerType !== CustomerType.WALK_IN && (
                <>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    className="w-full px-2 py-1.5 border rounded text-xs"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-2 py-1.5 border rounded text-xs"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Cart Items - Compact */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-6 w-6 mb-1 opacity-50" />
                  <p className="text-xs">Cart is empty</p>
                </div>
              </div>
            ) : (
              <CartPanel
                items={cart}
                onUpdateQuantity={updateCartItemQuantity}
                onRemoveItem={removeFromCart}
              />
            )}
          </div>

          {/* Cart Summary - Compact and always visible when items exist */}
          {cart.length > 0 && (
            <div className="border-t p-2 space-y-1 flex-shrink-0 bg-white">
              <div className="flex justify-between text-xs">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>VAT (10%)</span>
                <span>{formatCurrency(cartTotals.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>Total</span>
                <span>{formatCurrency(cartTotals.total)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons - Compact and always visible */}
          <div className={`p-2 border-t flex-shrink-0 bg-white ${cart.length > 8 ? 'sticky bottom-0' : ''}`}>
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="outline"
                onClick={clearCart}
                disabled={cart.length === 0}
                size="sm"
                className="text-xs px-2 py-1.5"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
              <Button
                variant="destructive"
                disabled={cart.length === 0}
                size="sm"
                className="text-xs px-2 py-1.5"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Void
              </Button>
              <Button
                variant="outline"
                disabled={cart.length === 0}
                size="sm"
                className="text-xs px-2 py-1.5"
              >
                <Receipt className="mr-1 h-3 w-3" />
                Hold
              </Button>
              <Button
                onClick={createTransaction}
                disabled={cart.length === 0}
                className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1.5"
                size="sm"
              >
                <CreditCard className="mr-1 h-3 w-3" />
                Pay
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {paymentDialogOpen && activeTransaction && (
        <PaymentDialog
          transaction={activeTransaction}
          onClose={() => {
            setPaymentDialogOpen(false);
            setActiveTransaction(null);
            clearCart();
          }}
          onPaymentComplete={(payment) => {
            console.log('Payment complete:', payment);
            setPaymentDialogOpen(false);
            setActiveTransaction(null);
            clearCart();
          }}
        />
      )}
    </div>
  );
}