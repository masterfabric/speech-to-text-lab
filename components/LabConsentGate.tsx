"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useConsent } from "@/components/ConsentProvider";

function GateSplash() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#fafafa] px-4 py-16">
      <Loader2 className="h-6 w-6 animate-spin text-tuik" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Gates the main lab: visitors without localStorage consent are sent to /onboarding.
 * /onboarding itself is exempt until approved, then redirects home.
 * Local/dev bypass: ConsentProvider treats the session as already consented
 * (see shouldBypassOnboardingGate) so this gate opens the lab immediately.
 */
export function LabConsentGate({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const router = useRouter();
  const pathname = usePathname();
  const onOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (consent === undefined) return;
    if (!consent && !onOnboarding) {
      router.replace("/onboarding");
    }
    if (consent && onOnboarding) {
      router.replace("/");
    }
  }, [consent, onOnboarding, router]);

  if (consent === undefined) return <GateSplash />;
  if (!consent && !onOnboarding) return <GateSplash />;
  if (consent && onOnboarding) return <GateSplash />;

  return <>{children}</>;
}
