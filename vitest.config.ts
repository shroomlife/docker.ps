import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

// Pin the timezone so moment-based time-formatting assertions are deterministic
// across machines/CI (the dockerLogs label tests assume UTC). Set before workers
// spawn so the runtime picks it up.
process.env.TZ = 'UTC'

export default defineVitestConfig({
  test: {
    // Unit / server tests run in Node by default. Component tests opt into the
    // Nuxt environment per-file via `// @vitest-environment nuxt`.
    environment: 'node',
    // The agent (apps/) is a separate Bun/Elysia app and keeps its own bun:test runner.
    exclude: [...configDefaults.exclude, 'apps/**'],
  },
})
