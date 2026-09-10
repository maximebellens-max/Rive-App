import type { NextConfig } from "next";

// En-têtes de sécurité HTTP appliqués à toutes les réponses (protection
// contre le détournement de clics, le sniffing MIME, les fuites de referrer,
// et l'injection de scripts via une Content-Security-Policy). Rive n'a pas
// de scripts/styles externes ni de client Supabase côté navigateur : la
// politique reste volontairement stricte, avec seulement les exceptions
// concrètement utilisées (autocomplétion d'adresse, avatars stockés sur
// Supabase). 'unsafe-inline' reste nécessaire pour le petit script inline de
// app/layout.tsx (choix du thème clair/sombre avant le premier rendu) et les
// styles injectés par Next.js — pas de nonce ici pour ne pas forcer tout le
// site en rendu dynamique (perte du rendu statique/cache).
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self';
  connect-src 'self' https://*.supabase.co https://api-adresse.data.gouv.fr;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Par défaut, une Server Action est limitée à 1 Mo de payload — trop
  // court pour l'envoi de photos de bien ou de PDF de diagnostics (fiche
  // mandat). Relevé à 10 Mo ; l'hébergement peut appliquer sa propre limite
  // indépendante (ex. Vercel), auquel cas suggérer de compresser le fichier
  // reste la solution si un envoi échoue malgré tout.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;