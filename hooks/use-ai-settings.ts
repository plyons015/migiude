"use client";

import { aiService } from "@/lib/ai/ai-service";
import type { AiProvider } from "@/lib/ai/types";
import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): AiProvider {
  return aiService.getPreferredProvider();
}

function getServerSnapshot(): AiProvider {
  return "gemini";
}

export function useAiSettings() {
  const provider = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setProvider = useCallback((next: AiProvider) => {
    aiService.setPreferredProvider(next);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return { provider, setProvider };
}
