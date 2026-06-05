import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { useAuthStore } from '../stores/authStore.js';

export function useNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications').then(r => r.data),
    enabled: isAuthenticated(),
    // Revisar cada 15 segundos automáticamente
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);
    const handleNew = () => invalidate();
    socket.on('user:won', handleNew);
    socket.on('user:lost', handleNew);
    return () => {
      socket.off('user:won', handleNew);
      socket.off('user:lost', handleNew);
    };
  }, [user?.id, invalidate]);

  const markRead = async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
    invalidate();
  };

  const markAllRead = async () => {
    await api.patch('/api/notifications/read-all');
    invalidate();
  };

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    markRead,
    markAllRead,
    invalidate,
  };
}
