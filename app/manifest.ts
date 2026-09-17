import type { MetadataRoute } from 'next'

// Manifest de l'appli installable (PWA) : icône sur l'écran d'accueil,
// lancement plein écran sans barre d'adresse. Next.js sert automatiquement
// ce fichier à /manifest.webmanifest et l'y référence dans le <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rive — CRM immobilier',
    short_name: 'Rive',
    description: 'Rive, le CRM pensé pour les agents immobiliers.',
    start_url: '/dashboard',
    display: 'standalone',
    // Couleur de fond affichée pendant le chargement (écran de démarrage) et
    // couleur de la barre de statut/navigateur une fois lancée — reprend
    // l'accent de marque (--color-accent en mode clair, voir app/globals.css)
    // plutôt qu'une couleur neutre par défaut.
    background_color: '#FFFFFF',
    theme_color: '#1F5C55',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // "maskable" : version avec davantage de marge autour du symbole, pour
      // survivre au recadrage circulaire/arrondi des icônes adaptatives
      // Android sans que le "R" ou les vagues soient coupés.
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}