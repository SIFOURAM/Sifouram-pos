import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Loader2, MessageCircle, Trash2, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function CoachSessions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [showMessagesDialog, setShowMessagesDialog] = useState({ open: false, session: null });
  const [messages, setMessages] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/coach/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Gagal memuat riwayat chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await api.get(`/coach/sessions/${sessionId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Gagal memuat pesan');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/coach/sessions/${deleteDialog.id}`);
      toast.success('Session berhasil dihapus');
      setDeleteDialog({ open: false, id: null });
      fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Gagal menghapus session');
    }
  };

  const viewMessages = async (session) => {
    setShowMessagesDialog({ open: true, session });
    await fetchMessages(session.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Riwayat AI Coach</h1>
        <p className="text-muted-foreground">Semua percakapan dengan AI Coach</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96">
            <MessageCircle className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Belum ada percakapan</p>
            <p className="text-muted-foreground">Mulai chat dengan AI Coach di menu Coach</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{session.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{session.message_count || 0} pesan</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => viewMessages(session)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteDialog({ open: true, id: session.id })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showMessagesDialog.open}
        onOpenChange={(open) => setShowMessagesDialog({ ...showMessagesDialog, open })}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{showMessagesDialog.session?.title || 'Chat AI Coach'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
              Session ini dan semua pesannya akan dihapus permanen.
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