import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Send, MessageCircle, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Broadcast() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    target: 'all',
    message: '',
  });

  const canBroadcast = ['owner', 'admin'].includes(user?.role);

  const handleSend = async () => {
    if (!formData.message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    try {
      setSending(true);
      await api.post('/broadcast', {
        target: formData.target,
        message: formData.message,
      });
      toast.success('Pesan broadcast berhasil dikirim!');
      setSent(true);
      setFormData({ target: 'all', message: '' });
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      toast.error(error.response?.data?.detail || 'Gagal mengirim broadcast');
    } finally {
      setSending(false);
    }
  };

  const exampleMessages = [
    'Reminder: Jangan lupa check-in sebelum mulai jual hari ini! 📍',
    'Info: Hari ini ada promo bundling 4 cup Rp45.000. Ajak customer beli banyak! 💰',
    'Selamat! Target penjualan bulan ini sudah tercapai. Keep up the good work! 🎉',
    'Update: Stok bahan baku baru sudah datang. Segera ambil di gudang. 📦',
  ];

  if (!canBroadcast) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Akses Ditolak</p>
              <p className="text-muted-foreground">Kamu tidak memiliki izin untuk mengirim broadcast</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Broadcast Message</h1>
        <p className="text-muted-foreground">Kirim pesan ke semua rider sekaligus via WhatsApp</p>
      </div>

      {sent && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Pesan broadcast berhasil dikirim! Rider akan menerima notifikasi di WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tulis Pesan</CardTitle>
            <CardDescription>Pesan akan dikirim via WhatsApp ke rider yang dipilih</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Penerima</Label>
              <Select
                value={formData.target}
                onValueChange={(val) => setFormData({ ...formData, target: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rider</SelectItem>
                  <SelectItem value="riders">Hanya Rider</SelectItem>
                  <SelectItem value="admins">Hanya Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pesan *</Label>
              <Textarea
                rows={8}
                placeholder="Ketik pesan broadcast di sini..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">{formData.message.length} karakter</p>
            </div>

            <Button onClick={handleSend} disabled={sending || !formData.message.trim()} size="lg" className="w-full">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Broadcast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Tips Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✅ Singkat & jelas</p>
              <p>✅ Pakai emoji secukupnya</p>
              <p>✅ Sertakan call-to-action</p>
              <p>❌ Jangan spam</p>
              <p>❌ Hindari all caps</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contoh Pesan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exampleMessages.map((example, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted rounded-lg text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setFormData({ ...formData, message: example })}
                >
                  {example}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}