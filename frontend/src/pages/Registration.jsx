import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Registration() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'rider',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Password dan konfirmasi password tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    if (!/^\d{6}$/.test(formData.pin)) {
      toast.error('PIN harus terdiri dari 6 angka');
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast.error('PIN dan konfirmasi PIN tidak cocok');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/register', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        role: formData.role,
        password: formData.password,
        pin: formData.pin,
      });
      setSuccess(true);
      toast.success('Pendaftaran berhasil! Menunggu persetujuan admin.');
    } catch (error) {
      console.error('Failed to register:', error);
      toast.error(error.response?.data?.detail || 'Gagal mendaftar');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Pendaftaran Berhasil!</h2>
            <p className="text-center text-muted-foreground mb-6">
              Akun kamu sedang menunggu persetujuan dari Owner atau Admin. Kamu akan diberi tahu setelah akun disetujui.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <img src="/assets/si-four-am-logo.png" alt="SI FOUR AM" className="w-12 h-12 object-contain" />
            <div>
              <CardTitle className="text-2xl">Daftar Akun Baru</CardTitle>
              <CardDescription>SI FOUR AM POS System</CardDescription>
            </div>
          </div>
          <Alert>
            <AlertDescription>
              Akun baru memerlukan persetujuan Owner/Admin sebelum dapat digunakan.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nomor HP (WhatsApp) *</Label>
              <Input
                type="tel"
                placeholder="081234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
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
              <Label>Mendaftar sebagai *</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="barteam">Bar Team</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Konfirmasi Password *</Label>
              <Input
                type="password"
                placeholder="Ketik ulang password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-pin">PIN Login *</Label>
              <Input
                id="register-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                placeholder="6 angka"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-pin">Konfirmasi PIN *</Label>
              <Input
                id="register-confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                placeholder="Ulangi 6 angka PIN"
                value={formData.confirmPin}
                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Daftar
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Sudah punya akun? Login di sini
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}