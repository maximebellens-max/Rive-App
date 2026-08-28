import type { Metadata } from "next";
// Polices du prototype, auto-hébergées via @fontsource (fichiers woff2 servis
// depuis notre propre build, aucune requête vers fonts.googleapis.com) :
// Archivo pour les titres, Manrope pour le texte courant, IBM Plex Mono pour
// les données chiffrées (perf, montants).
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/ibm-plex-mono/500.css";
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
