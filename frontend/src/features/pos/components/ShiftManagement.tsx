import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { posApi } from '@/lib/api/pos';
import type { Shift, OpenShiftRequest } from '@/types/pos';
import { Play, AlertCircle } from 'lucide-react';

interface ShiftManagementProps {
  onShiftOpened: (shift: Shift) => void;
}

export default function ShiftManagement({ onShiftOpened }: ShiftManagementProps) {
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openShift = async () => {
    setLoading(true);
    setError(null);

    try {
      const request: OpenShiftRequest = {
        terminal_id: 'POS-01',
        opening_cash: openingCash,
        opening_notes: notes || undefined
      };

      const shift = await posApi.openShift(request);
      onShiftOpened(shift);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to open shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Open POS Shift</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to open a shift before using the POS terminal
            </AlertDescription>
          </Alert>

          <div>
            <label className="text-sm font-medium">Opening Cash Amount</label>
            <input
              type="number"
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              value={openingCash || ''}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              placeholder="Enter opening cash amount"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this shift..."
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={openShift}
            disabled={loading}
          >
            <Play className="mr-2 h-4 w-4" />
            {loading ? 'Opening Shift...' : 'Open Shift'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}