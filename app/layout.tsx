import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rive — CRM immobilier",
  description: "Rive, le CRM pensé pour les agents immobiliers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 font-sans">{children}</body>
    </html>
  );
}
