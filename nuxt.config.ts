import { version } from './package.json'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],
  ssr: true,
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
    cookieSecret: process.env.NUXT_COOKIE_SECRET ?? '',
    jwtSecret: process.env.NUXT_JWT_SECRET ?? '',
    app: {
      secretKey: process.env.NUXT_APP_SECRET_KEY || '',
    },
    public: {
      appVersion: version,
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT || 'local',
    },
    google: {
      projectId: process.env.NUXT_GOOGLE_PROJECT_ID ?? '',
      clientId: process.env.NUXT_GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET ?? '',
      scope: process.env.NUXT_GOOGLE_SCOPE ?? 'openid',
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
