import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Trophy, Medal, Award, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function RiderRanks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ranks, setRanks] = useState({
    bronze: { min_sales: 0, bonus_rate: 0 },
    silver: { min_sales: 0, bonus_rate: 0 },
    gold: { min_sales: 0, bonus_rate: 0 },
    platinum: { min_sales: 0, bonus_rate: 0 },
  });

  const canManage = ['owner', 'admin'].includes(user?.role);

  useEffect(() => {
    fetchRanks();
  }, []);

  const fetchRanks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rider-ranks');
      setRanks(response.data);
    } catch (error) {
      console.error('Failed to fetch ranks:', error);
      toast.error('Gagal memuat data rank');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/rider-ranks', ranks);
      toast.success('Sistem rank berhasil diperbarui');
      fetchRanks();
    } catch (error) {
      console.error('Failed to update ranks:', error);
      toast.error(error.response?.data?.detail || 'Gagal memperbarui rank');
    } finally {
      setSaving(false);
    }
  };

  const updateRank = (rank, field, value) => {
    setRanks({
      ...ranks,
      [rank]: {
        ...ranks[rank],
        [field]: parseFloat(value) || 0,
      },
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const rankConfig = {
    bronze: { label: 'Bronze', icon: Award, color: 'bg-orange-100 text-orange-800' },
    silver: { label: 'Silver', icon: Medal, color: 'bg-gray-100 text-gray-800' },
    gold: { label: 'Gold', icon: Trophy, color: 'bg-yellow-100 text-yellow-800' },
    platinum: { label: 'Platinum', icon: Trophy, color: 'bg-purple-100 text-purple-800' },
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
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Akses Ditolak</p>
              <p className="text-muted-foreground">Kamu tidak memiliki izin untuk mengelola rank</p>
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
          <h1 className="text-3xl font-bold">Sistem Rank Rider</h1>
          <p className="text-muted-foreground">Kelola threshold penjualan & bonus tiap rank</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Simpan Perubahan
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(rankConfig).map(([rank, config]) => {
          const Icon = config.icon;
          const data = ranks[rank];

          return (
            <Card key={rank}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${config.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle>{config.label}</CardTitle>
                    <CardDescription>
                      Target: {formatCurrency(data.min_sales)} • Bonus: {data.bonus_rate}%
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Minimal Penjualan per Bulan (Rp)</Label>
                  <Input
                    type="number"
                    value={data.min_sales}
                    onChange={(e) => updateRank(rank, 'min_sales', e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Rider harus capai {formatCurrency(data.min_sales)} untuk naik ke rank ini
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Bonus Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={data.bonus_rate}
                    onChange={(e) => updateRank(rank, 'bonus_rate', e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Rider dapat bonus {data.bonus_rate}% dari total penjualan
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contoh Perhitungan</CardTitle>
          <CardDescription>Simulasi bonus berdasarkan rank</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(rankConfig).map(([rank, config]) => {
              const data = ranks[rank];
              const exampleSales = data.min_sales * 1.2; // 120% dari threshold
              const bonus = exampleSales * (data.bonus_rate / 100);

              return (
                <div key={rank} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${config.color.replace('bg-', 'bg-').replace(' text-', '')}`} />
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-sm text-muted-foreground">
                        Penjualan: {formatCurrency(exampleSales)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrency(bonus)}</div>
                    <div className="text-xs text-muted-foreground">bonus</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}