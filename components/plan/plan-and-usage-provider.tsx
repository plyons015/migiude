"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { fetchPlanAndUsage } from "@/lib/plan/client";
import { DEFAULT_LAUNCH_PLAN_CONFIG } from "@/lib/plan/config-schema";
import { isCloudFunctionsNetworkFailure } from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";
import { offlinePlanAndUsageFallback } from "@/lib/plan/offline-fallback";
import type { PlanAndUsageResponse } from "@/lib/plan/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PlanAndUsageContextValue = {
  data: PlanAndUsageResponse | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  refresh: () => Promise<void>;
  config: PlanAndUsageResponse["config"];
  plan: PlanAndUsageResponse["plan"];
  usage: PlanAndUsageResponse["usage"] | null;
  limits: PlanAndUsageResponse["limits"] | null;
  display: PlanAndUsageResponse["display"] | null;
};

const PlanAndUsageContext = createContext<PlanAndUsageContextValue | null>(
  null,
);

export function PlanAndUsageProvider({ children }: { children: ReactNode }) {
  const { uid, loading: authLoading } = useAuthUser();
  const [data, setData] = useState<PlanAndUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const uidRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const activeUid = uidRef.current;
    if (!activeUid) {
      return;
    }
    if (!isFirebaseConfigured()) {
      setData(offlinePlanAndUsageFallback());
      setOffline(true);
      setError(null);
      return;
    }
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const run = (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchPlanAndUsage();
        if (uidRef.current !== activeUid) return;
        setData(next);
        setOffline(false);
      } catch (e) {
        if (uidRef.current !== activeUid) return;
        if (isCloudFunctionsNetworkFailure(e)) {
          setData(offlinePlanAndUsageFallback());
          setOffline(true);
          setError(null);
        } else {
          setError(e instanceof Error ? e.message : "Could not load plan usage.");
          setData(null);
          setOffline(false);
        }
      } finally {
        if (uidRef.current === activeUid) {
          setLoading(false);
        }
      }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    uidRef.current = uid;
    if (authLoading) return;

    if (!uid) {
      setData(null);
      setError(null);
      setOffline(false);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setData(offlinePlanAndUsageFallback());
      setOffline(true);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const next = await fetchPlanAndUsage();
        if (cancelled || uidRef.current !== uid) return;
        setData(next);
        setOffline(false);
      } catch (e) {
        if (cancelled || uidRef.current !== uid) return;
        if (isCloudFunctionsNetworkFailure(e)) {
          setData(offlinePlanAndUsageFallback());
          setOffline(true);
          setError(null);
        } else {
          setError(e instanceof Error ? e.message : "Could not load plan usage.");
          setData(null);
          setOffline(false);
        }
      } finally {
        if (!cancelled && uidRef.current === uid) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, uid]);

  const value = useMemo<PlanAndUsageContextValue>(
    () => ({
      data,
      loading: loading || authLoading,
      error,
      offline,
      refresh,
      config: data?.config ?? DEFAULT_LAUNCH_PLAN_CONFIG,
      plan: data?.plan ?? "free",
      usage: data?.usage ?? null,
      limits: data?.limits ?? null,
      display: data?.display ?? null,
    }),
    [data, loading, authLoading, error, offline, refresh],
  );

  return (
    <PlanAndUsageContext.Provider value={value}>
      {children}
    </PlanAndUsageContext.Provider>
  );
}

export function usePlanAndUsage(): PlanAndUsageContextValue {
  const ctx = useContext(PlanAndUsageContext);
  if (!ctx) {
    throw new Error("usePlanAndUsage must be used within PlanAndUsageProvider");
  }
  return ctx;
}
