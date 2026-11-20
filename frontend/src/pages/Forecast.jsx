import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function Forecast() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const response = await api.get('/forecast');
      setForecast(response.data);
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
      toast.error('Gagal memuat prediksi');
    } finally {
      setLoading(false);
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

  if (!forecast) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Data Tidak Cukup</p>
              <p className="text-muted-foreground">Butuh minimal 7 hari data penjualan untuk prediksi</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trend = forecast.trend || 'stable';
  const trendConfig = {
    up: { label: 'Naik', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    down: { label: 'Turun', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
    stable: { label: 'Stabil', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
  };

  const trendInfo = trendConfig[trend];
  const TrendIcon = trendInfo.icon;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prediksi Penjualan</h1>
        <p className="text-muted-foreground">Prediksi penjualan minggu depan berdasarkan AI</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediksi Minggu Depan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(forecast.next_week || 0)}</div>
            <p className="text-xs text-muted-foreground">estimasi total penjualan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendIcon className={`h-4 w-4 ${trendInfo.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendInfo.label}</div>
            <p className="text-xs text-muted-foreground">
              {forecast.change_percent > 0 ? '+' : ''}
              {forecast.change_percent?.toFixed(1)}% dari minggu lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast.confidence || 75}%</div>
            <p className="text-xs text-muted-foreground">tingkat kepercayaan prediksi</p>
          </CardContent>
        </Card>
      </div>

      {forecast.daily && (
        <Card>
          <CardHeader>
            <CardTitle>Prediksi Harian</CardTitle>
            <CardDescription>Estimasi penjualan per hari minggu depan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecast.daily.map((day, idx) => {
                const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-muted-foreground">
                        {dayNames[idx]}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden w-64">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${(day.sales / Math.max(...forecast.daily.map((d) => d.sales))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="font-bold">{formatCurrency(day.sales)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {forecast.recommendations && forecast.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rekomendasi</CardTitle>
            <CardDescription>Saran dari AI untuk meningkatkan penjualan</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {forecast.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Badge className="mt-0.5">{idx + 1}</Badge>
                  <p className="text-sm">{rec}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}