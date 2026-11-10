import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { tokenStore } from '../api/tokenStore';

const WS_URL = (process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws').replace(/^http/, 'ws');

/**
 * Live channel for one booking over STOMP/WebSocket.
 *
 *   const { connected, sendChat, sendLocation } = useBookingChannel(bookingId, {
 *     onChat:     (message) => ...,   // { id, senderId, content, createdAt }
 *     onLocation: (ping)    => ...,   // { latitude, longitude, senderId, timestamp }
 *   });
 *
 * Handlers are kept in refs so changing them never tears down the socket.
 * The connection authenticates with the user's JWT in the STOMP CONNECT frame.
 */
export function useBookingChannel(bookingId, { onChat, onLocation } = {}) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const chatRef = useRef(onChat);
  const locRef = useRef(onLocation);

  useEffect(() => {
    chatRef.current = onChat;
    locRef.current = onLocation;
  }, [onChat, onLocation]);

  useEffect(() => {
    if (!bookingId) return undefined;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Re-read the token on every (re)connect so refreshed tokens are used.
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${tokenStore.getAccess()}` };
      },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/bookings/${bookingId}/chat`, (frame) => {
          try {
            chatRef.current?.(JSON.parse(frame.body));
          } catch (_) { /* ignore malformed frame */ }
        });
        client.subscribe(`/topic/bookings/${bookingId}/location`, (frame) => {
          try {
            locRef.current?.(JSON.parse(frame.body));
          } catch (_) { /* ignore malformed frame */ }
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      setConnected(false);
      clientRef.current = null;
      client.deactivate();
    };
  }, [bookingId]);

  const sendChat = useCallback(
    (content) => {
      const client = clientRef.current;
      if (!client?.connected) return false;
      client.publish({
        destination: `/app/bookings/${bookingId}/chat`,
        body: JSON.stringify({ content }),
      });
      return true;
    },
    [bookingId]
  );

  const sendLocation = useCallback(
    (latitude, longitude) => {
      const client = clientRef.current;
      if (!client?.connected) return false;
      client.publish({
        destination: `/app/bookings/${bookingId}/location`,
        body: JSON.stringify({ latitude, longitude }),
      });
      return true;
    },
    [bookingId]
  );

  return { connected, sendChat, sendLocation };
}
