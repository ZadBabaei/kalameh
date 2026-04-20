'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  serverUrl: string;
  gameCode: string;
  playerId: number | null;
  onEvent?: (event: string, data: unknown) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
}

const GAME_EVENTS = [
  'game:state',
  'game:player_joined',
  'game:player_disconnected',
  'game:player_reconnected',
  'game:phase_changed',
  'game:words_progress',
  'game:all_words_submitted',
  'game:turn_order',
  'game:turn_started',
  'game:word_for_describer',
  'game:correct',
  'game:skip',
  'game:turn_ended',
  'game:round_ended',
  'game:finished',
  'game:error',
] as const;

export function useSocket({
  serverUrl,
  gameCode,
  playerId,
  onEvent,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  // Keep callback ref current without triggering reconnect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!serverUrl || !gameCode) return;

    const socket = io(serverUrl, {
      query: { gameCode, playerId: playerId ?? undefined },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (playerId) {
        socket.emit('player:reconnect', { gameCode, playerId });
      }
    });

    socket.on('disconnect', () => setIsConnected(false));

    GAME_EVENTS.forEach((event) => {
      socket.on(event, (data: unknown) => onEventRef.current?.(event, data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverUrl, gameCode, playerId]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, isConnected, emit };
}
