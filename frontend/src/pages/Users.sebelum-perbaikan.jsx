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
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, UserPlus, Camera, Mail, Phone, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function Users() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState({ open: false, user: null });
  const [approvalDialog, setApprovalDialog] = useState({ open: false, userId: null, action: null });
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'rider',
    password: '',
  });

  const canManageUsers = ['owner', 'admin'].includes(user?.role);

  useEffect(() => {
    fetchUsers();
    fetchPendingUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get('/users/pending');
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    }
  };

  const handleApproval = async () => {
    const { userId, action } = approvalDialog;
    try {
      setSubmitting(true);
      await api.post(`/users/${userId}/${action}`);
      toast.success(action === 'approve' ? 'User berhasil disetujui' : 'User ditolak');
      setApprovalDialog({ open: false, userId: null, action: null });
      fetchUsers();
      fetchPendingUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(error.response?.data?.detail || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} user`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.phone || !formData.password) {
      toast.error('Nama, nomor HP, dan password wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/users', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        role: formData.role,
        password: formData.password,
      });

      const newUserId = response.data.id;

      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        await api.put(`/users/${newUserId}/photo`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('User berhasil dibuat');
      setShowAddDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.detail || 'Gagal membuat user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!showEditDialog.user) return;

    try {
      setSubmitting(true);
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        role: formData.role,
      };

      await api.put(`/users/${showEditDialog.user.id}`, updateData);

      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        await api.put(`/users/${showEditDialog.user.id}/photo`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('User berhasil diperbarui');
      setShowEditDialog({ open: false, user: null });
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.detail || 'Gagal memperbarui user');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', role: 'rider', password: '' });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const openEditDialog = (userData) => {
    setFormData({
      name: userData.name,
      phone: userData.phone,
      email: userData.email || '',
      role: userData.role,
      password: '',
    });
    setPhotoPreview('');
    setPhotoFile(null);
    setShowEditDialog({ open: true, user: userData });
  };

  const roleConfig = {
    owner: { label: 'Owner', color: 'bg-purple-100 text-purple-800' },
    admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
    barteam: { label: 'Bar Team', color: 'bg-orange-100 text-orange-800' },
    rider: { label: 'Rider', color: 'bg-green-100 text-green-800' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Akses Ditolak</p>
              <p className="text-muted-foreground">Kamu tidak memiliki izin untuk mengelola user</p>
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
          <h1 className="text-3xl font-bold">Kelola User</h1>
          <p className="text-muted-foreground">Tambah dan edit user (rider/admin)</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="lg">
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            User Aktif ({users.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval ({pendingUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(roleConfig).map(([role, config]) => {
              const count = users.filter((u) => u.role === role).length;
              return (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle>{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{count}</div>
                    <p className="text-xs text-muted-foreground">user</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar User Aktif</CardTitle>
              <CardDescription>Semua user yang sudah disetujui</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Belum ada user
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={userData.photo} />
                              <AvatarFallback>{userData.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{userData.name}</div>
                              <div className="text-sm text-muted-foreground">@{userData.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleConfig[userData.role]?.color}>
                            {roleConfig[userData.role]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {userData.phone}
                            </div>
                            {userData.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {userData.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(userData.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(userData)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permintaan Pendaftaran</CardTitle>
              <CardDescription>User yang menunggu persetujuan Owner/Admin</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-16 h-16 mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Tidak ada permintaan pending</p>
                  <p className="text-sm text-muted-foreground">Semua pendaftaran sudah diproses</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role yang Diminta</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Tanggal Daftar</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((pendingUser) => (
                      <TableRow key={pendingUser.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{pendingUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{pendingUser.name}</div>
                              <Badge variant="outline" className="mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleConfig[pendingUser.role]?.color}>
                            {roleConfig[pendingUser.role]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {pendingUser.phone}
                            </div>
                            {pendingUser.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {pendingUser.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(pendingUser.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setApprovalDialog({ open: true, userId: pendingUser.id, action: 'approve' })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setApprovalDialog({ open: true, userId: pendingUser.id, action: 'reject' })}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Tolak
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Tambah User */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Buat akun untuk rider atau admin baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={photoPreview} />
                <AvatarFallback>
                  <Camera className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Camera className="w-4 h-4" />
                  Upload Foto
                </div>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor HP *</Label>
              <Input
                placeholder="081234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (opsional)</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="barteam">Bar Team</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {user?.role === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  Membuat...
                </>
              ) : (
                'Buat User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit User */}
      <Dialog
        open={showEditDialog.open}
        onOpenChange={(open) => setShowEditDialog({ ...showEditDialog, open })}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Perbarui informasi user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={photoPreview || showEditDialog.user?.photo} />
                <AvatarFallback>
                  {showEditDialog.user?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="photo-upload-edit" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Camera className="w-4 h-4" />
                  Ganti Foto
                </div>
                <Input
                  id="photo-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor HP</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="barteam">Bar Team</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {user?.role === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog({ open: false, user: null })}
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

      {/* Dialog Approval */}
      <AlertDialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog.action === 'approve' ? 'Setujui Pendaftaran?' : 'Tolak Pendaftaran?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog.action === 'approve'
                ? 'User ini akan bisa login dan menggunakan aplikasi.'
                : 'User ini akan dihapus dan tidak bisa login.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproval}
              disabled={submitting}
              className={approvalDialog.action === 'reject' ? 'bg-destructive' : ''}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : approvalDialog.action === 'approve' ? (
                'Setujui'
              ) : (
                'Tolak'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}