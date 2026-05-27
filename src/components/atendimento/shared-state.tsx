"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface SharedState {
  resetVersion: number;
  resetAll: () => void;
}

const SharedStateContext = createContext<SharedState | null>(null);

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [resetVersion, setResetVersion] = useState(0);

  const resetAll = useCallback(() => {
    setResetVersion((v) => v + 1);
  }, []);

  return (
    <SharedStateContext.Provider value={{ resetVersion, resetAll }}>
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx)
    throw new Error("useSharedState must be inside SharedStateProvider");
  return ctx;
}
