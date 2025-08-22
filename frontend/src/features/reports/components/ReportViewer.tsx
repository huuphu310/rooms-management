import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { reportsApi } from '@/lib/api/reports'
import type { ExecuteReportResponse, ReportFormat } from '@/types/reports'
import {
  Download,
  Printer,
  Share2,
  Maximize2,
  X,
  FileText,
  BarChart3,
  Table as TableIcon,
  Loader2,
  Mail,
  Copy,
  Check
} from 'lucide-react'

interface ReportViewerProps {
  reportId?: string
  reportData?: ExecuteReportResponse
  onClose?: () => void
  onExport?: (format: ReportFormat) => void
  onShare?: () => void
  onPrint?: () => void
}

export default function ReportViewer({
  reportId,
  reportData,
  onClose,
  onExport,
  onShare,
  onPrint
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeView, setActiveView] = useState<'table' | 'chart' | 'summary'>('summary')
  const [loading, setLoading] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ReportFormat>('pdf')
  const [copied, setCopied] = useState(false)

  const handleExport = async (format: ReportFormat) => {
    if (onExport) {
      setLoading(true)
      try {
        await onExport(format)
      } finally {
        setLoading(false)
      }
    }
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  const handleShare = () => {
    setShareDialogOpen(true)
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/reports/view/${reportId}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Report Share')
    const body = encodeURIComponent(`View the report at: ${window.location.origin}/reports/view/${reportId}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No report data to display</p>
        </CardContent>
      </Card>
    )
  }

  const ViewerContent = () => (
    <div className="space-y-6">
      {/* Viewer Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Report Viewer</h2>
          <p className="text-muted-foreground mt-1">
            Generated on {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={exportFormat === 'pdf' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={loading}
            >
              PDF
            </Button>
            <Button
              variant={exportFormat === 'excel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={loading}
            >
              Excel
            </Button>
            <Button
              variant={exportFormat === 'csv' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={loading}
            >
              CSV
            </Button>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
        <TabsList>
          <TabsTrigger value="summary">
            <FileText className="mr-2 h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="chart">
            <BarChart3 className="mr-2 h-4 w-4" />
            Charts
          </TabsTrigger>
        </TabsList>

        {/* Summary View */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>
                Key highlights and insights from the report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.data?.summary ? (
                <div className="space-y-4">
                  {Object.entries(reportData.data.summary).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="font-medium capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-lg font-semibold">
                        {typeof value === 'number' 
                          ? value.toLocaleString()
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No summary data available</p>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {reportData.data?.metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(reportData.data.metrics).map(([key, value]) => (
                    <div key={key} className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-2xl font-bold mt-2">
                        {typeof value === 'number' 
                          ? value.toLocaleString()
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Table</CardTitle>
              <CardDescription>
                Detailed tabular view of report data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.data?.table_data ? (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {reportData.data.table_data.headers?.map((header: string) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.table_data.rows?.map((row: any[], index: number) => (
                        <TableRow key={index}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {typeof cell === 'number' 
                                ? cell.toLocaleString()
                                : String(cell)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No table data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart View */}
        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
              <CardDescription>
                Graphical representation of report data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Chart visualization coming soon...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Charts will be rendered using the report's chart configuration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Report ID</p>
              <p className="font-medium">{reportData.execution_id || reportId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={reportData.success ? 'default' : 'destructive'}>
                {reportData.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File URL</p>
              {reportData.file_url ? (
                <a href={reportData.file_url} className="text-blue-600 hover:underline">
                  Download File
                </a>
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </div>
          </div>
          {reportData.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Error: {reportData.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Share Dialog
  const ShareDialog = () => (
    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Report</DialogTitle>
          <DialogDescription>
            Share this report with others via link or email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={`${window.location.origin}/reports/view/${reportId}`}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-muted"
              />
              <Button
                variant="outline"
                onClick={copyShareLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={shareViaEmail}
            >
              <Mail className="mr-2 h-4 w-4" />
              Share via Email
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto p-6">
        <ViewerContent />
        <ShareDialog />
      </div>
    )
  }

  return (
    <>
      <ViewerContent />
      <ShareDialog />
    </>
  )
}