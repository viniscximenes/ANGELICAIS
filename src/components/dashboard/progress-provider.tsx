"use client";

import type { ReactNode } from "react";

import { ProgressProvider } from "@bprogress/next/app";

export function ProgressBarProvider({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
}
