import { version } from './package.json'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      title: 'docker.ps - smart & easy docker management',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nata+Sans:wght@100..900&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      appVersion: version,
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT || 'local',
    },
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    preset: 'bun',
    compressPublicAssets: true,
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
