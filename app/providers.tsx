"use client";

import type React from "react";

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { GlobalVariablesProvider } from "@/hooks/use-global-variables";
import { GlobalListsProvider } from "@/hooks/use-global-lists";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalListsProvider>
        <GlobalVariablesProvider>
        {children}
        <Toaster position="top-right" richColors />
        </GlobalVariablesProvider>
      </GlobalListsProvider>
    </AuthProvider>
  );
}
