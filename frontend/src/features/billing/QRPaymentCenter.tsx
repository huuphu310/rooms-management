import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { billingEnhancedApi } from '@/lib/api/billing-enhanced'
import { QrCode, Plus, Eye, RefreshCw } from 'lucide-react'

export default function QRPaymentCenter() {
  const [qrPayments, setQrPayments] = useState([])
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">QR Payment Center</h2>
          <p className="text-muted-foreground">
            Generate and manage VietQR codes for instant bank transfers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate QR Code
        </Button>
      </div>

      {/* Feature Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Instant Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate unique QR codes for each payment with automatic tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Auto Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatic matching of bank transfers via SEAPay webhook integration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Real-time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor payment status and receive instant notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QR Payment List */}
      <Card>
        <CardHeader>
          <CardTitle>Active QR Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">QR Payment Management</h3>
            <p className="text-muted-foreground mb-4">
              Generate VietQR codes for bank transfer payments with automatic reconciliation
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Unique QR codes for each payment
              </p>
              <p className="text-sm text-muted-foreground">
                • SEAPay webhook integration
              </p>
              <p className="text-sm text-muted-foreground">
                • Automatic payment matching
              </p>
              <p className="text-sm text-muted-foreground">
                • Real-time status updates
              </p>
            </div>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Create QR Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}