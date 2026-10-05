"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";

export function usePollingQuery<T>(url: string | null, interval = 15_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (background = false) => {
      if (!url) return;
      controller.current?.abort();
      controller.current = new AbortController();
      if (background) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await apiFetch<T>(url, { signal: controller.current.signal });
        setData(next);
        setError(null);
        setLastUpdated(new Date());
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError((caught as Error).message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [url],
  );

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    if (!url || interval <= 0) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refresh(true);
      }
    }, interval);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      controller.current?.abort();
    };
  }, [interval, refresh, url]);

  return { data, error, loading, refreshing, lastUpdated, refresh };
}
