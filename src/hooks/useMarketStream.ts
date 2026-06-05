import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../api/client';
import { MarketTick, OptionChain, PositionUpdate, SocketEnvelope } from '../api/types';

interface UseMarketStreamParams {
  enabled: boolean;
  onTick: (tick: MarketTick) => void;
  onOptionChain?: (chain: OptionChain) => void;
  onPositionUpdate?: (update: PositionUpdate) => void;
}

export const useMarketStream = ({ enabled, onTick, onOptionChain, onPositionUpdate }: UseMarketStreamParams) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    setStatus('connecting');

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('open');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketEnvelope<unknown>;

        if (message.event === 'tick') {
          onTick(message.data as MarketTick);
        }

        if (message.event === 'option_chain' && onOptionChain) {
          onOptionChain(message.data as OptionChain);
        }

        if (message.event === 'position_update' && onPositionUpdate) {
          onPositionUpdate(message.data as PositionUpdate);
        }
      } catch {
        // Ignore malformed messages from the socket stream.
      }
    };

    socket.onerror = () => {
      setStatus('error');
    };

    socket.onclose = () => {
      setStatus('closed');
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [enabled, onOptionChain, onPositionUpdate, onTick]);

  return status;
};
