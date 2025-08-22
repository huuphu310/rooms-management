/**
 * Enhanced Customer List Component based on documentation
 */
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  Plus, 
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { 
  customersEnhancedApi,
  Customer,
  CustomerSearchParams,
  CustomerType,
  VIPStatus,
  CustomerStatus,
  getVIPBadgeColor,
  getCustomerTypeLabel,
  getCustomerStatusColor,
  formatCurrency,
  getInitials
} from '@/lib/api/customers-enhanced'

interface CustomerListEnhancedProps {
  onCustomerSelect?: (customer: Customer) => void
  onCustomerEdit?: (customer: Customer) => void
  onCustomerCreate?: () => void
}

export function CustomerListEnhanced({
  onCustomerSelect,
  onCustomerEdit,
  onCustomerCreate
}: CustomerListEnhancedProps) {
  const [filters, setFilters] = useState<CustomerSearchParams>({
    search: '',
    customer_type: undefined,
    vip_status: undefined,
    status: undefined,
    has_stayed: undefined,
    is_blacklisted: undefined,
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    order: 'desc'
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers-enhanced', filters],
    queryFn: () => customersEnhancedApi.search(filters),
    keepPreviousData: true
  })

  const handleFilterChange = (key: keyof CustomerSearchParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSort = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy,
      order: prev.sort_by === sortBy && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      customer_type: undefined,
      vip_status: undefined,
      status: undefined,
      has_stayed: undefined,
      is_blacklisted: undefined,
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      order: 'desc'
    })
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500">Failed to load customers</p>
            <Button onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-muted-foreground">
            Manage customer profiles and relationships
          </p>
        </div>
        {onCustomerCreate && (
          <Button onClick={onCustomerCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{data.pagination.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">VIP Customers</p>
                  <p className="text-2xl font-bold">
                    {data.data.filter(c => c.vip_status !== VIPStatus.NONE).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {data.data.filter(c => c.status === CustomerStatus.ACTIVE).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Has Stayed</p>
                  <p className="text-2xl font-bold">
                    {data.data.filter(c => c.statistics && c.statistics.total_stays > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Customer Type */}
            <Select
              value={filters.customer_type || 'all'}
              onValueChange={(value) => 
                handleFilterChange('customer_type', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Customer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(CustomerType).map(type => (
                  <SelectItem key={type} value={type}>
                    {getCustomerTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* VIP Status */}
            <Select
              value={filters.vip_status || 'all'}
              onValueChange={(value) => 
                handleFilterChange('vip_status', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="VIP Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All VIP</SelectItem>
                {Object.values(VIPStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => 
                handleFilterChange('status', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(CustomerStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p>Loading customers...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('full_name')}
                    >
                      Customer
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('customer_type')}
                    >
                      Type
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('vip_status')}
                    >
                      VIP Status
                    </TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Statistics</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('created_at')}
                    >
                      Joined
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onCustomerSelect?.(customer)}
                    >
                      {/* Customer Info */}
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(customer.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.customer_code}
                            </p>
                            {customer.is_blacklisted && (
                              <Badge variant="destructive" className="text-xs">
                                Blacklisted
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Mail className="h-3 w-3" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.address?.country && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{customer.address.country}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge variant="secondary">
                          {getCustomerTypeLabel(customer.customer_type)}
                        </Badge>
                      </TableCell>

                      {/* VIP Status */}
                      <TableCell>
                        <Badge className={getVIPBadgeColor(customer.vip_status)}>
                          <Star className="h-3 w-3 mr-1" />
                          {customer.vip_status.charAt(0).toUpperCase() + customer.vip_status.slice(1)}
                        </Badge>
                      </TableCell>

                      {/* Profile Completeness */}
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Profile</span>
                            <span>{customer.statistics?.profile_completeness || 0}%</span>
                          </div>
                          <Progress 
                            value={customer.statistics?.profile_completeness || 0} 
                            className="h-1"
                          />
                          <Badge className={getCustomerStatusColor(customer.status)}>
                            {customer.status}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Statistics */}
                      <TableCell>
                        {customer.statistics ? (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Stays:</span>
                              <span className="font-medium">{customer.statistics.total_stays}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Spent:</span>
                              <span className="font-medium">
                                {formatCurrency(customer.statistics.lifetime_value)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Points:</span>
                              <span className="font-medium">{customer.statistics.loyalty_points}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No data</span>
                        )}
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell>
                        <span className="text-sm">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onCustomerSelect?.(customer)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCustomerEdit?.(customer)}>
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              View Bookings
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Add Loyalty Points
                            </DropdownMenuItem>
                            {!customer.is_blacklisted ? (
                              <DropdownMenuItem className="text-red-600">
                                Blacklist Customer
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem>
                                Remove from Blacklist
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.pagination.total_pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                    {data.pagination.total} customers
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.pagination.page - 1)}
                      disabled={data.pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {data.pagination.page} of {data.pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.pagination.page + 1)}
                      disabled={data.pagination.page >= data.pagination.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}