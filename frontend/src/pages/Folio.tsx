import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  Search, 
  FileText, 
  Eye, 
  Lock, 
  Unlock,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { folioApi } from '@/lib/api/folio';
import { FolioViewer } from '@/features/folio/FolioViewer';
import type { FolioListItem, FolioStatement } from '@/types/folio';

export default function FolioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch folios list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['folios', page, filterStatus],
    queryFn: () => folioApi.list({
      page,
      limit,
      is_closed: filterStatus === 'all' ? undefined : filterStatus === 'closed'
    })
  });

  // Fetch selected folio details
  const { data: folioDetails } = useQuery({
    queryKey: ['folio', selectedFolio],
    queryFn: () => selectedFolio ? folioApi.getByBookingId(selectedFolio) : null,
    enabled: !!selectedFolio
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleViewFolio = (bookingId: string) => {
    setSelectedFolio(bookingId);
    setViewerOpen(true);
  };

  const handleCloseFolio = async (folioId: string) => {
    try {
      await folioApi.close(folioId);
      refetch();
    } catch (error) {
      console.error('Error closing folio:', error);
    }
  };

  const handleReopenFolio = async (folioId: string) => {
    try {
      await folioApi.reopen(folioId);
      refetch();
    } catch (error) {
      console.error('Error reopening folio:', error);
    }
  };

  const filteredFolios = data?.folios?.filter(folio => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      folio.folio_number.toLowerCase().includes(search) ||
      folio.booking_code.toLowerCase().includes(search) ||
      folio.guest_name.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Folio Management</h1>
        <p className="text-muted-foreground">
          View and manage guest folios and financial transactions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by folio number, booking code, or guest name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folios</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Folios List */}
      <Card>
        <CardHeader>
          <CardTitle>Folios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading folios...</div>
          ) : filteredFolios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No folios found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio Number</TableHead>
                  <TableHead>Booking Code</TableHead>
                  <TableHead>Guest Name</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFolios.map((folio) => (
                  <TableRow key={folio.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {folio.folio_number}
                      </div>
                    </TableCell>
                    <TableCell>{folio.booking_code}</TableCell>
                    <TableCell>{folio.guest_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(folio.total_charges)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(folio.total_credits)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={folio.balance > 0 ? 'text-destructive font-semibold' : 'text-green-600'}>
                        {formatCurrency(folio.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={folio.is_closed ? 'secondary' : 'default'}>
                        {folio.is_closed ? (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Closed
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            Open
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(folio.created_at), 'dd/MM/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewFolio(folio.booking_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!folio.is_closed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCloseFolio(folio.id)}
                            disabled={folio.balance !== 0}
                            title={folio.balance !== 0 ? 'Cannot close folio with outstanding balance' : 'Close folio'}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReopenFolio(folio.id)}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data?.pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total || 0)} of {data.pagination.total || 0} folios
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data?.folios || data.folios.length < limit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Folio Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Folio Details</DialogTitle>
          </DialogHeader>
          {folioDetails && (
            <FolioViewer
              folio={folioDetails}
              onClose={() => setViewerOpen(false)}
              onPayment={() => {
                // Handle payment
                console.log('Process payment');
              }}
              onPrint={() => {
                // Handle print
                window.print();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}