import { useEffect, useRef, useCallback } from "react";
import { WS_URL } from "../utils/constants";

export default function useGameSocket(userId, onMessage) {
  const wsRef = useRef(null);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMsgRef.current(data);
      } catch {}
    };

    ws.onclose = () => {
      // Auto-reconnect after 2s
      reconnectTimer.current = setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          connect();
        }
      }, 2000);
    };

    ws.onerror = () => {};
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, ws: wsRef };
}
