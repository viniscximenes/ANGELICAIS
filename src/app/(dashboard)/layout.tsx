import type { ReactNode } from "react";

import { AppHeader } from "@/components/dashboard/app-header";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}
