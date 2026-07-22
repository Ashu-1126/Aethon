import { useEffect, useRef } from "react";
import { IS_MOCK } from "@/lib/api";

const WS_BASE =
  (typeof window !== "undefined"
    ? window.location.origin.replace(/^http/, "ws")
    : "ws://localhost:8080"
  ).replace(":3000", ":8080"); // dev: next on 3000, FastAPI on 8080

/**
 * Subscribes to a backend WebSocket endpoint and calls `onMessage`
 * with every parsed JSON payload.
 *
 * - No-ops in IS_MOCK mode (no backend available).
 * - Reconnects automatically on close / error (exponential back-off, max 30 s).
 * - Cleans up the socket when the component unmounts.
 *
 * @param path    Server path, e.g. "/ws/ingest"
 * @param onMessage  Callback invoked with each parsed JSON message.
 */
export function useWebSocket<T = unknown>(
  path: string,
  onMessage: (data: T) => void
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (IS_MOCK) return; // No backend in mock / static mode

    let ws: WebSocket | null = null;
    let retryDelay = 1000; // start at 1 s
    let stopped = false;

    function connect() {
      if (stopped) return;
      const url = `${WS_BASE}${path}`;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const data: T = JSON.parse(evt.data);
          onMessageRef.current(data);
        } catch {
          // Ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };

      ws.onerror = () => {
        ws?.close();
      };

      ws.onopen = () => {
        retryDelay = 1000; // reset back-off on successful connection
      };
    }

    connect();

    return () => {
      stopped = true;
      ws?.close();
    };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
}
