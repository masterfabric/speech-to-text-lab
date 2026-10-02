import type { Metadata } from "next";
import { JetBrains_Mono, Sora, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "speech-to-text-lab · ALO 124 STT Laboratuvarı",
  description:
    "TÜİK ALO 124 tarzı çağrı merkezi sesi için eğitim amaçlı speech-to-text laboratuvarı. Sentetik demo sesler; gerçek kişisel veri yoktur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${sora.variable} ${sourceSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-black">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
