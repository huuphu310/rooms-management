import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BillingDashboard from './BillingDashboard'
import InvoiceManagement from './InvoiceManagement'
import PaymentManagement from './PaymentManagement'
import PaymentSchedules from './PaymentSchedules'
import QRPaymentCenter from './QRPaymentCenter'
import { 
  BarChart3, 
  Receipt, 
  CreditCard, 
  QrCode, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react'

export default function BillingEnhanced() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Mock data for quick stats in tabs
  const quickStats = {
    todayCollections: 25000000,
    pendingPayments: 8500000,
    totalInvoices: 156,
    qrPayments: 12
  }

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
          <h1 className="text-4xl font-bold tracking-tight">Enhanced Billing System</h1>
          <p className="text-muted-foreground mt-1">
            Complete payment management with advanced features and automation
          </p>
        </div>
        <Badge variant="default" className="bg-green-600">
          SEAPay Integrated
        </Badge>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('dashboard')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dashboard</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(quickStats.todayCollections)}
            </div>
            <p className="text-xs text-muted-foreground">Today's collections</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('invoices')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {Math.floor(quickStats.pendingPayments / 1000000)}M VND pending
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('payments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Multiple Methods</div>
            <p className="text-xs text-muted-foreground">Cash, Cards, Transfers</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setActiveTab('qr-payments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Payments</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.qrPayments}</div>
            <p className="text-xs text-muted-foreground">Active QR codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="qr-payments" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Payments
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {activeTab === 'dashboard' && <BillingDashboard />}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6 mt-6">
          {activeTab === 'invoices' && <InvoiceManagement />}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6 mt-6">
          {activeTab === 'payments' && <PaymentManagement />}
        </TabsContent>

        <TabsContent value="qr-payments" className="space-y-6 mt-6">
          {activeTab === 'qr-payments' && <QRPaymentCenter />}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6 mt-6">
          {activeTab === 'schedules' && <PaymentSchedules />}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive revenue analysis with collection rates and payment method breakdown
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Invoice Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track invoice status, aging analysis, and payment patterns
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyze payment method usage, fees, and processing times
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track overdue payments, customer payment behavior, and collection strategies
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Payment Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor QR payment usage, success rates, and bank transfer reconciliation
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Collection Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Measure collection efficiency, deposit conversion rates, and payment timing
                </p>
                <Button size="sm" variant="outline">Generate Report</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Billing Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <QrCode className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">SEAPay Integration</p>
                <p className="text-sm text-muted-foreground">Automatic QR payment matching</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Multi-Invoice Support</p>
                <p className="text-sm text-muted-foreground">Deposits, partial, final payments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Payment Schedules</p>
                <p className="text-sm text-muted-foreground">Automated installment tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Smart Reminders</p>
                <p className="text-sm text-muted-foreground">Automated overdue notifications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}