import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function githubPagesBase() {
  if (process.env.GITHUB_ACTIONS !== 'true') return '/'
  const repo = (process.env.GITHUB_REPOSITORY ?? '').split('/')[1] ?? ''
  const owner = process.env.GITHUB_REPOSITORY_OWNER ?? ''
  if (!repo) return '/'
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${repo}/`
}

const base = githubPagesBase()

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'luminarias/lum-010.webp',
        'luminarias/lum-016-hero.webp',
        'luminarias/lum-016-profile.webp',
        'luminarias/lum-017.webp',
        'luminarias/lum-254.webp',
        'luminarias/lum-avf.webp',
        'luminarias/lum-014.webp',
        'luminarias/lum-984.webp',
        'luminarias/lum-035.webp',
        'luminarias/lum-mas.webp',
        'luminarias/lum-l75.webp',
        'luminarias/lum-948.webp',
        'luminarias/lum-cas.webp',
        'luminarias/lum-erj-front.webp',
        'luminarias/lum-erj-side.webp',
        'luminarias/lum-erj-rear.webp',
      ],
      manifest: {
        name: 'Localizador de Materiais',
        short_name: 'Localizador',
        description: 'Localização rápida de materiais em bombonas',
        theme_color: '#111827',
        background_color: '#f5f6f8',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,json}']
      }
    })
  ]
})
