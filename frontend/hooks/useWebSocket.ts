"use client";
import { useEffect, useRef } from "react";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

const WS_BASE =
  (typeof window !== "undefined"
    ? window.location.origin.replace(/^http/, "ws")
    : "ws://localhost:8080"
  ).replace(":3000", ":8080");

/**
 * Subscribes to a backend WebSocket endpoint and calls `onMessage`
 * with every parsed JSON payload.
 */
export function useWebSocket<T = unknown>(
  path: string,
  onMessage: (data: T) => void
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (IS_MOCK) return;

    let ws: WebSocket | null = null;
    let retryDelay = 1000;
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
        retryDelay = 1000;
      };
    }

    connect();

    return () => {
      stopped = true;
      ws?.close();
    };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
}
