import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ReportDefinition } from '@/types/reports'
import {
  Play,
  Download,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  Star,
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Shield
} from 'lucide-react'

interface QuickReportsProps {
  reports: ReportDefinition[]
  onRunReport: (reportId: string, parameters?: Record<string, any>) => void
  onDownloadReport?: (reportId: string, format: string) => void
  onConfigureReport?: (reportId: string) => void
}

export default function QuickReports({ 
  reports, 
  onRunReport, 
  onDownloadReport,
  onConfigureReport 
}: QuickReportsProps) {
  const [runningReports, setRunningReports] = useState<Set<string>>(new Set())
  const [selectedParameters, setSelectedParameters] = useState<Record<string, any>>({})

  const handleRunReport = async (reportId: string) => {
    setRunningReports(prev => new Set(prev).add(reportId))
    try {
      await onRunReport(reportId, selectedParameters[reportId])
    } finally {
      setRunningReports(prev => {
        const next = new Set(prev)
        next.delete(reportId)
        return next
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      operational: Settings,
      financial: DollarSign,
      guest: Users,
      performance: TrendingUp,
      inventory: Package,
      compliance: Shield,
      custom: FileText
    }
    return icons[category] || FileText
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      guest: 'bg-purple-100 text-purple-800',
      performance: 'bg-orange-100 text-orange-800',
      inventory: 'bg-cyan-100 text-cyan-800',
      compliance: 'bg-red-100 text-red-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const renderParameterInput = (reportId: string, paramKey: string, paramConfig: any) => {
    const value = selectedParameters[reportId]?.[paramKey] || paramConfig.default

    const updateParameter = (newValue: any) => {
      setSelectedParameters(prev => ({
        ...prev,
        [reportId]: {
          ...prev[reportId],
          [paramKey]: newValue
        }
      }))
    }

    switch (paramConfig.type) {
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => updateParameter(date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'select':
        return (
          <Select value={value} onValueChange={updateParameter}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${paramKey}`} />
            </SelectTrigger>
            <SelectContent>
              {paramConfig.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'month':
        return (
          <input
            type="month"
            value={value || ''}
            onChange={(e) => updateParameter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )

      default:
        return (
          <input
            type={paramConfig.type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => updateParameter(e.target.value)}
            placeholder={`Enter ${paramKey}`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )
    }
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Quick Access Reports
          </CardTitle>
          <CardDescription>
            No favorite reports yet. Star reports to add them here for quick access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Click the star icon on any report to add it to your favorites
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Quick Access Reports
        </CardTitle>
        <CardDescription>
          Your frequently used reports for quick execution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map(report => {
            const Icon = getCategoryIcon(report.report_category)
            const isRunning = runningReports.has(report.id)
            const hasParameters = report.parameters && Object.keys(report.parameters).length > 0

            return (
              <div
                key={report.id}
                className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                {/* Report Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(report.report_category)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{report.report_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Metadata */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {report.report_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {report.report_category}
                  </Badge>
                </div>

                {/* Parameters */}
                {hasParameters && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Parameters:</p>
                    {Object.entries(report.parameters!).map(([key, config]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {config.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderParameterInput(report.id, key, config)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRunReport(report.id)}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <>
                        <Clock className="mr-2 h-3 w-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3 w-3" />
                        Run
                      </>
                    )}
                  </Button>
                  {onDownloadReport && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadReport(report.id, 'pdf')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  {onConfigureReport && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConfigureReport(report.id)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}