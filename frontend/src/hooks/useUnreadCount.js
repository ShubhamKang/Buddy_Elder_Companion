import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '../api/endpoints';
import { tokenStore } from '../api/tokenStore';

/** Polls the unread-notification count (also refreshes when the tab regains focus). */
export function useUnreadCount(intervalMs = 30000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!tokenStore.isAuthenticated()) return;
    try {
      const data = await notificationsApi.unreadCount();
      setCount(data?.unread ?? 0);
    } catch (_) {
      /* badge is best-effort */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications:changed', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:changed', onFocus);
    };
  }, [refresh, intervalMs]);

  return { count, refresh };
}
