import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}