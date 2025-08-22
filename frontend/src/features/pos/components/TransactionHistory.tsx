import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/types/pos';
import { formatCurrency, getTransactionStatusColor, getPaymentMethodLabel } from '@/lib/api/pos';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="p-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm">{transaction.transaction_code}</p>
              <p className="text-xs text-gray-500">
                {new Date(transaction.created_at).toLocaleString()}
              </p>
              {transaction.customer_name && (
                <p className="text-xs text-gray-600">{transaction.customer_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(transaction.total_amount)}</p>
              <Badge className={`text-xs bg-${getTransactionStatusColor(transaction.status)}-100`}>
                {transaction.status}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}