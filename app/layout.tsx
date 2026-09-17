import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "./_components/sw-register";
// Polices auto-hébergées via @fontsource (fichiers woff2 servis depuis notre
// propre build, aucune requête vers fonts.googleapis.com) : Inter pour tout
// le texte de l'appli — titres et texte courant — plutôt que la paire
// Archivo/Manrope d'avant, pour se rapprocher du rendu "un seul système de
// police" façon SF Pro sur macOS/iOS (dessin très proche, mais utilisable
// partout, contrairement à SF Pro qui n'est utilisable sur le web que sur
// les appareils Apple eux-mêmes). IBM Plex Mono reste à part pour les
// données chiffrées (perf, montants) — non concerné par ce changement.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rive — CRM immobilier",
  description: "Rive, le CRM pensé pour les agents immobiliers.",
  // manifest.webmanifest est généré par app/manifest.ts — Next.js l'ajoute
  // automatiquement au <head>, il n'y a rien à référencer ici pour lui.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // "Ajouter à l'écran d'accueil" côté iOS/Safari lit ces balises
  // spécifiques à Apple plutôt que le manifest standard (non supporté par
  // Safari) : capable = plein écran sans barre Safari, title = nom affiché
  // sous l'icône.
  appleWebApp: {
    capable: true,
    title: "Rive",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F5C55",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 font-sans">
        {/* Pose le thème choisi (clair/sombre) AVANT le premier rendu visible,
            pour éviter un flash du mauvais thème au chargement. Un choix
            "système" ne laisse rien dans localStorage : la media query CSS
            @media(prefers-color-scheme) s'en charge seule, aucun script requis. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('rive-theme');if(m==='light'||m==='dark'){document.documentElement.setAttribute('data-theme',m)}}catch(e){}",
          }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}