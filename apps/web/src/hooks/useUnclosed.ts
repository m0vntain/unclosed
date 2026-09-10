import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Root, ScanProgress, WorkItem } from "../../../../shared/types";
export function useUnclosed() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [roots, setRoots] = useState<Root[]>([]);
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [nextItems, config, nextScan] = await Promise.all([
      api<WorkItem[]>("/work-items"),
      api<{ roots: Root[] }>("/config"),
      api<ScanProgress>("/scans/current"),
    ]);
    setItems(nextItems);
    setRoots(config.roots);
    setScan(nextScan);
    setLoading(false);
  }, []);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (live) await refresh();
      } catch (e) {
        if (live) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
      if (live) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  const mutate = async (path: string, body: unknown = {}) => {
    setBusy(true);
    setError("");
    try {
      await api(path, body);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    items,
    roots,
    scan,
    loading,
    error,
    setError,
    busy,
    mutate,
    refresh,
  };
}
