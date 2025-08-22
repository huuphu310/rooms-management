import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { posApi, formatCurrency, getPaymentMethodLabel } from '@/lib/api/pos';
import type { Transaction, ProcessPaymentRequest, PaymentMethod } from '@/types/pos';
import {
  CreditCard,
  DollarSign,
  QrCode,
  Home,
  Banknote,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';

interface PaymentDialogProps {
  transaction: Transaction;
  onClose: () => void;
  onPaymentComplete: (payment: any) => void;
}

export default function PaymentDialog({
  transaction,
  onClose,
  onPaymentComplete
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async () => {
    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const request: ProcessPaymentRequest = {
        payment_method: selectedMethod,
        amount: transaction.total_amount
      };

      if (selectedMethod === PaymentMethod.CASH) {
        request.payment_details = {
          tendered: cashTendered || transaction.total_amount
        };
      }

      const result = await posApi.processPayment(transaction.id, request);

      if ('qr_code_url' in result) {
        // QR payment initiated
        setQrCodeUrl(result.qr_code_url);
        // Start polling for payment status
        pollPaymentStatus(transaction.id);
      } else {
        // Direct payment completed
        onPaymentComplete(result);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (transactionId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await posApi.checkPaymentStatus(transactionId);
        if (status.payment_status === 'completed') {
          clearInterval(interval);
          onPaymentComplete(status.payment_received);
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Summary */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Transaction Code</span>
                <span className="font-medium">{transaction.transaction_code}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(transaction.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT (10%)</span>
                <span>{formatCurrency(transaction.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total Amount</span>
                <span className="text-green-600">
                  {formatCurrency(transaction.total_amount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Methods */}
          {!qrCodeUrl && (
            <>
              <div>
                <h3 className="font-medium mb-3">Select Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      selectedMethod === PaymentMethod.CASH
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethod(PaymentMethod.CASH)}
                  >
                    <div className="flex flex-col items-center">
                      <Banknote className="h-8 w-8 mb-2 text-green-600" />
                      <span className="font-medium">Cash</span>
                    </div>
                  </Card>

                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      selectedMethod === PaymentMethod.BANK_TRANSFER
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethod(PaymentMethod.BANK_TRANSFER)}
                  >
                    <div className="flex flex-col items-center">
                      <DollarSign className="h-8 w-8 mb-2 text-blue-600" />
                      <span className="font-medium">Bank Transfer</span>
                    </div>
                  </Card>

                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      selectedMethod === PaymentMethod.QR_CODE
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethod(PaymentMethod.QR_CODE)}
                  >
                    <div className="flex flex-col items-center">
                      <QrCode className="h-8 w-8 mb-2 text-purple-600" />
                      <span className="font-medium">QR Payment</span>
                    </div>
                  </Card>

                  {transaction.customer_type === 'guest' && (
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        selectedMethod === PaymentMethod.ROOM_CHARGE
                          ? 'border-primary ring-2 ring-primary'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedMethod(PaymentMethod.ROOM_CHARGE)}
                    >
                      <div className="flex flex-col items-center">
                        <Home className="h-8 w-8 mb-2 text-orange-600" />
                        <span className="font-medium">Room Charge</span>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Cash Input */}
              {selectedMethod === PaymentMethod.CASH && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Cash Tendered</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      placeholder={transaction.total_amount.toString()}
                    />
                  </div>
                  <div className="flex gap-2">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashTendered(amount)}
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                  {cashTendered > transaction.total_amount && (
                    <Alert>
                      <AlertDescription>
                        Change: {formatCurrency(cashTendered - transaction.total_amount)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}

          {/* QR Code Display */}
          {qrCodeUrl && (
            <div className="text-center space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Scan QR code to complete payment. Waiting for confirmation...
                </AlertDescription>
              </Alert>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCodeUrl} alt="Payment QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-600">
                Amount: {formatCurrency(transaction.total_amount)}
              </p>
              <div className="animate-pulse">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm mt-2">Waiting for payment...</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            {!qrCodeUrl && (
              <Button
                onClick={processPayment}
                disabled={!selectedMethod || processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Process Payment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}