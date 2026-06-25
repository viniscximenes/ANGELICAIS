"use client";

import type { ReactNode } from "react";

import { ProgressProvider } from "@bprogress/next/app";

export function ProgressBarProvider({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="4px"
      color="#3b82f6"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
}
