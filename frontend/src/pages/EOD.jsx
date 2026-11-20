import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function EOD() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eodData, setEodData] = useState(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closing, setClosing] = useState(false);
  const [formData, setFormData] = useState({
    cash_actual: '',
    qris_actual: '',
    transfer_actual: '',
    note: '',
  });

  const isRider = user?.role === 'rider';

  useEffect(() => {
    fetchEOD();
  }, []);

  const fetchEOD = async () => {
    try {
      setLoading(true);
      const params = isRider ? {} : { rider_id: 'all' };
      const response = await api.get('/sales/eod', { params });
      setEodData(response.data);
    } catch (error) {
      console.error('Failed to fetch EOD:', error);
      toast.error('Gagal memuat data EOD');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEOD = async () => {
    if (!formData.cash_actual || !formData.qris_actual) {
      toast.error('Jumlah cash dan QRIS harus diisi');
      return;
    }

    try {
      setClosing(true);
      await api.post('/sales/eod/close', {
        cash_actual: parseFloat(formData.cash_actual),
        qris_actual: parseFloat(formData.qris_actual),
        transfer_actual: parseFloat(formData.transfer_actual || 0),
        note: formData.note,
      });
      toast.success('EOD berhasil ditutup!');
      setShowCloseDialog(false);
      fetchEOD();
      setFormData({ cash_actual: '', qris_actual: '', transfer_actual: '', note: '' });
    } catch (error) {
      console.error('Failed to close EOD:', error);
      toast.error(error.response?.data?.detail || 'Gagal menutup EOD');
    } finally {
      setClosing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const eod = eodData?.eod || {};
  const canClose = eod.status === 'open' && isRider;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">End of Day (EOD)</h1>
          <p className="text-muted-foreground">Tutup penjualan harian</p>
        </div>
        {canClose && (
          <Button onClick={() => setShowCloseDialog(true)} size="lg">
            <CheckCircle className="w-4 h-4 mr-2" />
            Tutup EOD
          </Button>
        )}
      </div>

      {eod.status === 'closed' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            EOD sudah ditutup pada {new Date(eod.closed_at).toLocaleString('id-ID')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(eod.total_sales || 0)}</div>
            <p className="text-xs text-muted-foreground">{eod.sales_count || 0} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(eod.cash_expected || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Aktual: {formatCurrency(eod.cash_actual || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QRIS</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(eod.qris_expected || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Aktual: {formatCurrency(eod.qris_actual || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {eodData?.sales?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detail Transaksi Hari Ini</CardTitle>
            <CardDescription>Daftar semua penjualan</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eodData.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleTimeString('id-ID')}</TableCell>
                    <TableCell>{sale.customer_name || '-'}</TableCell>
                    <TableCell>
                      {sale.items.map((item) => `${item.qty}x ${item.name}`).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup EOD</DialogTitle>
            <DialogDescription>
              Masukkan jumlah cash & QRIS aktual yang kamu terima hari ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cash Aktual *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.cash_actual}
                onChange={(e) => setFormData({ ...formData, cash_actual: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Expected: {formatCurrency(eod.cash_expected || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>QRIS Aktual *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.qris_actual}
                onChange={(e) => setFormData({ ...formData, qris_actual: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Expected: {formatCurrency(eod.qris_expected || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Transfer (opsional)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.transfer_actual}
                onChange={(e) => setFormData({ ...formData, transfer_actual: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan EOD (opsional)"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={closing}>
              Batal
            </Button>
            <Button onClick={handleCloseEOD} disabled={closing}>
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menutup...
                </>
              ) : (
                'Tutup EOD'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}