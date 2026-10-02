"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ConsentProvider } from "@/components/ConsentProvider";
import { LabConsentGate } from "@/components/LabConsentGate";
import { SiteFooter } from "@/components/SiteFooter";

/** Client shell: locale + consent gate + page body + localized footer. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ConsentProvider>
        <LabConsentGate>
          <div className="flex flex-1 flex-col">{children}</div>
        </LabConsentGate>
        <SiteFooter />
      </ConsentProvider>
    </LocaleProvider>
  );
}
