import { useEffect, useRef } from 'react';
import { useWebSocketStore } from '../stores/websocketStore';

export function useWebSocket(experimentId) {
  const wsRef = useRef(null);
  const setConnected = useWebSocketStore((s) => s.setConnected);
  const addEvent = useWebSocketStore((s) => s.addEvent);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to experiment
      const subId = experimentId || '*';
      ws.send(JSON.stringify({ action: 'subscribe', experiment_id: subId }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'heartbeat' || msg.type === 'pong' || msg.type === 'subscribed') return;
        addEvent(msg);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      setConnected(false);
    };
  }, [experimentId, setConnected, addEvent]);

  return wsRef;
}
