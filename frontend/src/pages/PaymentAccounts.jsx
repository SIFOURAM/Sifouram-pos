import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, CreditCard, Building2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentAccounts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState({ open: false, account: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bank',
    name: '',
    account_number: '',
    account_name: '',
  });

  const canManage = ['owner', 'admin'].includes(user?.role);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payment-accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch payment accounts:', error);
      toast.error('Gagal memuat akun pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.account_number) {
      toast.error('Nama dan nomor rekening wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/payment-accounts', formData);
      toast.success('Akun pembayaran berhasil dibuat');
      setShowAddDialog(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Failed to create payment account:', error);
      toast.error(error.response?.data?.detail || 'Gagal membuat akun pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!showEditDialog.account) return;

    try {
      setSubmitting(true);
      await api.put(`/payment-accounts/${showEditDialog.account.id}`, formData);
      toast.success('Akun pembayaran berhasil diperbarui');
      setShowEditDialog({ open: false, account: null });
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Failed to update payment account:', error);
      toast.error(error.response?.data?.detail || 'Gagal memperbarui akun pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/payment-accounts/${deleteDialog.id}`);
      toast.success('Akun pembayaran berhasil dihapus');
      setDeleteDialog({ open: false, id: null });
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete payment account:', error);
      toast.error(error.response?.data?.detail || 'Gagal menghapus akun pembayaran');
    }
  };

  const resetForm = () => {
    setFormData({ type: 'bank', name: '', account_number: '', account_name: '' });
  };

  const openEditDialog = (account) => {
    setFormData({
      type: account.type,
      name: account.name,
      account_number: account.account_number,
      account_name: account.account_name || '',
    });
    setShowEditDialog({ open: true, account });
  };

  const typeConfig = {
    bank: { label: 'Bank Transfer', icon: Building2, color: 'bg-blue-100 text-blue-800' },
    qris: { label: 'QRIS', icon: Smartphone, color: 'bg-green-100 text-green-800' },
    ewallet: { label: 'E-Wallet', icon: CreditCard, color: 'bg-purple-100 text-purple-800' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Akses Ditolak</p>
              <p className="text-muted-foreground">Kamu tidak memiliki izin untuk mengelola akun pembayaran</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Akun Pembayaran</h1>
          <p className="text-muted-foreground">Kelola rekening bank & QRIS untuk deposit</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Object.entries(typeConfig).map(([type, config]) => {
          const count = accounts.filter((a) => a.type === type).length;
          const Icon = config.icon;
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">akun aktif</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Akun Pembayaran</CardTitle>
          <CardDescription>Rekening yang bisa dipakai untuk deposit rider</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Nomor Rekening</TableHead>
                <TableHead>Nama Pemilik</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada akun pembayaran
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const config = typeConfig[account.type];
                  const Icon = config.icon;
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="font-mono">{account.account_number}</TableCell>
                      <TableCell>{account.account_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(account)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteDialog({ open: true, id: account.id })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun Pembayaran</DialogTitle>
            <DialogDescription>Tambah rekening bank atau QRIS baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipe *</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama (misal: BCA, GoPay) *</Label>
              <Input
                placeholder="BCA"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening *</Label>
              <Input
                placeholder="1234567890"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pemilik (opsional)</Label>
              <Input
                placeholder="John Doe"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog.open}
        onOpenChange={(open) => setShowEditDialog({ ...showEditDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Akun Pembayaran</DialogTitle>
            <DialogDescription>Perbarui informasi akun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pemilik</Label>
              <Input
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog({ open: false, account: null })}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun ini akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}