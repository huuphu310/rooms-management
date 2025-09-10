import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { checkoutApi } from '@/lib/api/folio';
import { FolioViewer } from '@/features/folio/FolioViewer';
import type { CheckoutSummary } from '@/types/folio';
import { toast } from '@/components/ui/use-toast';

interface CheckoutModalProps {
  bookingId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  bookingId,
  open,
  onClose,
  onSuccess
}) => {
  const [checkoutDate, setCheckoutDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [waiveSurcharge, setWaiveSurcharge] = useState(false);
  const [showFolio, setShowFolio] = useState(false);
  const [step, setStep] = useState<'summary' | 'payment' | 'complete'>('summary');

  // Fetch checkout summary
  const { data: summary, isLoading: loadingSummary, refetch } = useQuery({
    queryKey: ['checkout-summary', bookingId, checkoutDate],
    queryFn: () => checkoutApi.getSummary(bookingId, format(checkoutDate, 'yyyy-MM-dd')),
    enabled: open && !!bookingId
  });

  // Process early checkout
  const earlyCheckoutMutation = useMutation({
    mutationFn: () => checkoutApi.processEarly({
      booking_id: bookingId,
      checkout_date: format(checkoutDate, 'yyyy-MM-dd'),
      waive_surcharge: waiveSurcharge
    }),
    onSuccess: () => {
      refetch();
      toast({
        title: 'Early Checkout Processed',
        description: 'Early checkout fees have been applied.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to process early checkout',
        variant: 'destructive'
      });
    }
  });

  // Complete checkout
  const completeCheckoutMutation = useMutation({
    mutationFn: () => checkoutApi.complete(
      bookingId,
      parseFloat(paymentAmount) || 0,
      paymentMethod
    ),
    onSuccess: () => {
      setStep('complete');
      toast({
        title: 'Checkout Complete',
        description: 'Guest has been successfully checked out.',
      });
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to complete checkout',
        variant: 'destructive'
      });
    }
  });

  useEffect(() => {
    if (summary?.final_balance) {
      setPaymentAmount(summary.final_balance > 0 ? summary.final_balance.toString() : '0');
    }
  }, [summary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleProceedToPayment = async () => {
    if (summary?.is_early_checkout && !waiveSurcharge) {
      await earlyCheckoutMutation.mutateAsync();
    }
    setStep('payment');
  };

  const handleCompleteCheckout = () => {
    completeCheckoutMutation.mutate();
  };

  if (step === 'complete') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Checkout Complete!</h3>
            <p className="text-muted-foreground text-center">
              Guest has been successfully checked out.
              {summary?.statement.folio_number && (
                <span className="block mt-2">
                  Invoice: {summary.statement.folio_number}
                </span>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'summary' ? 'Checkout Summary' : 'Process Payment'}
          </DialogTitle>
        </DialogHeader>

        {loadingSummary ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : summary && (
          <>
            {step === 'summary' && (
              <div className="space-y-6">
                {/* Guest Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Guest Name</Label>
                    <p className="font-medium">{summary.guest_name}</p>
                  </div>
                  <div>
                    <Label>Booking Code</Label>
                    <p className="font-medium">{summary.booking_code}</p>
                  </div>
                  <div>
                    <Label>Check-in Date</Label>
                    <p className="font-medium">
                      {format(new Date(summary.check_in_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label>Original Checkout</Label>
                    <p className="font-medium">
                      {format(new Date(summary.original_checkout), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                {/* Checkout Date Selection */}
                <div>
                  <Label>Actual Checkout Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !checkoutDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkoutDate ? format(checkoutDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkoutDate}
                        onSelect={(date) => date && setCheckoutDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Early Checkout Warning */}
                {summary.is_early_checkout && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>This is an early checkout. An early checkout fee may apply.</p>
                        <p className="font-semibold">
                          Potential Fee: {formatCurrency(summary.potential_early_checkout_fee)}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Checkbox
                            id="waive"
                            checked={waiveSurcharge}
                            onCheckedChange={(checked) => setWaiveSurcharge(checked as boolean)}
                          />
                          <Label htmlFor="waive" className="cursor-pointer">
                            Waive early checkout surcharge
                          </Label>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Financial Summary */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Financial Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Room Charges</span>
                      <span>{formatCurrency(summary.statement.summary.room_charges)}</span>
                    </div>
                    {summary.statement.summary.pos_charges > 0 && (
                      <div className="flex justify-between">
                        <span>POS Charges</span>
                        <span>{formatCurrency(summary.statement.summary.pos_charges)}</span>
                      </div>
                    )}
                    {summary.statement.summary.surcharges > 0 && (
                      <div className="flex justify-between">
                        <span>Surcharges</span>
                        <span>{formatCurrency(summary.statement.summary.surcharges)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Charges</span>
                      <span>{formatCurrency(summary.statement.summary.grand_total)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Total Credits</span>
                      <span>- {formatCurrency(Math.abs(summary.statement.summary.total_credits))}</span>
                    </div>
                    <Separator />
                    <div className={`flex justify-between text-lg font-bold ${summary.final_balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      <span>Balance Due</span>
                      <span>{formatCurrency(summary.final_balance)}</span>
                    </div>
                  </div>
                </div>

                {/* View Full Folio Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFolio(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Folio Statement
                </Button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                {/* Payment Required Alert */}
                {summary.payment_required && (
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      Payment of {formatCurrency(summary.final_balance)} is required to complete checkout.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer">Bank Transfer</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Payment Amount */}
                <div>
                  <Label>Payment Amount</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                  {parseFloat(paymentAmount) < summary.final_balance && (
                    <p className="text-sm text-destructive mt-1">
                      Partial payment. Remaining: {formatCurrency(summary.final_balance - parseFloat(paymentAmount))}
                    </p>
                  )}
                  {parseFloat(paymentAmount) > summary.final_balance && (
                    <p className="text-sm text-green-600 mt-1">
                      Change: {formatCurrency(parseFloat(paymentAmount) - summary.final_balance)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              {step === 'summary' ? (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleProceedToPayment} disabled={earlyCheckoutMutation.isPending}>
                    {earlyCheckoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {summary.payment_required ? 'Proceed to Payment' : 'Complete Checkout'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep('summary')}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleCompleteCheckout}
                    disabled={completeCheckoutMutation.isPending}
                  >
                    {completeCheckoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CreditCard className="h-4 w-4 mr-2" />
                    Complete Checkout
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}

        {/* Folio Viewer Dialog */}
        {showFolio && summary && (
          <Dialog open={showFolio} onOpenChange={setShowFolio}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Folio Statement</DialogTitle>
              </DialogHeader>
              <FolioViewer
                folio={summary.statement}
                onClose={() => setShowFolio(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};