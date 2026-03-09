# Copilot Instructions – Nuxt 4 Projects

## Core Principles

1. **TypeScript First** – Every function, variable, and return type is explicitly typed. No exceptions.
2. **Mobile First** – Base styles are mobile, scale up with `sm:`, `md:`, `lg:`, `xl:`.
3. **No `any` or `unknown`** – Always use proper types. If typing seems hard, rethink the approach.

## Stack

- **Runtime**: Bun (never npm/yarn/pnpm)
- **Framework**: Nuxt 4
- **Database**: PostgreSQL + Prisma v7
- **UI**: NuxtUI v4 + Tailwind CSS + SCSS
- **Validation**: Zod
- **State**: Pinia (Setup Stores)
- **Auth**: JWT
- **Linting**: ESLint with `stylistic: true`

## Commands

```bash
bun install          # Install deps (also run after type changes in /shared/types)
bun lint             # ESLint check
bun typecheck        # Nuxt typecheck
```

## Project Structure

```
app/
├── components/       # Auto-imported (PascalCase.vue)
├── composables/      # Auto-imported (useName.ts)
├── layouts/
├── pages/
├── plugins/
├── middleware/
├── stores/           # Pinia stores (nameStore.ts)
└── utils/            # Auto-imported
shared/
├── types/            # Auto-imported types (run `bun i` after changes!)
└── prisma/           # Generated Prisma client
server/
├── api/              # REST routes (resource.method.ts)
├── middleware/
├── services/         # Business logic
└── utils/
prisma/
├── schema.prisma
└── migrations/
prisma.config.ts      # Prisma v7 config (datasource URL here!)
```

## Vue Components

Order: `<script>` → `<template>` → `<style>`

```vue
<script lang="ts" setup>
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
})

const emit = defineEmits<{
  update: [value: string]
}>()
</script>

<template>
  <div class="p-4 md:p-6">
    <h1>{{ title }}</h1>
  </div>
</template>

<style lang="scss" scoped>
// Only when Tailwind isn't enough
</style>
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard.vue` |
| Composables | `use` prefix | `useAuth.ts` |
| Stores | `nameStore` | `userStore.ts` → `defineStore('UserStore')` |
| Types | PascalCase | `User.ts`, `ApiResponse.ts` |
| Server routes | kebab + method | `users.get.ts`, `auth-login.post.ts` |
| Functions | camelCase, verb-first | `fetchUser()`, `handleSubmit()` |
| Booleans | `is/has/can` prefix | `isLoading`, `hasPermission` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES`, `API_URL` |

## TypeScript

Always explicit types. Prefer arrow functions for async. Avoid non-null assertions (`!`).

```ts
// ✅ Arrow functions with explicit types
const getUser = async (id: string): Promise<User | null> => {
  return users.find(u => u.id === id) ?? null
}

// ✅ Nullish coalescing instead of !
const name = user?.name ?? 'Unknown'
```

## Shared Types

Types in `/shared/types/` are auto-imported globally. **Run `bun i` after adding or changing types!**

```ts
// shared/types/user.ts
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export type UserRole = 'admin' | 'user' | 'guest'
```

## Pinia Stores

Setup Store syntax. Location: `/app/stores/`. Naming: `nameStore` variable → `defineStore('NameStore')`.

```ts
// app/stores/userStore.ts
export const userStore = defineStore('UserStore', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  const fetchUser = async (): Promise<void> => {
    isLoading.value = true
    try {
      user.value = await $fetch<User>('/api/user')
    } finally {
      isLoading.value = false
    }
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    isAuthenticated,
    fetchUser,
  }
})
```

## Zod Validation

Schemas are single source of truth. Infer types from them.

```ts
// server/utils/schemas/user.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
})

export type CreateUserPayload = z.infer<typeof createUserSchema>

// Server route validation
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, data: result.error.flatten() })
  }

  return userService.create(result.data)
})
```

## Prisma v7 + PostgreSQL

**CRITICAL**: Prisma v7 has breaking changes. Config is now in `prisma.config.ts`, NOT in schema.prisma!

### prisma.config.ts

```ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

### prisma/schema.prisma

```prisma
generator client {
  provider               = "prisma-client"
  output                 = "../shared/prisma"
  importFileExtension    = "ts"
  generatedFileExtension = "ts"
  runtime                = "bun"
  previewFeatures        = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

enum Role {
  ADMIN
  USER
}
```

### Prisma Client (server/utils/prisma.ts)

```ts
import 'dotenv/config'
import { PrismaClient } from '~/shared/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma as prismaClient }
```

Usage in server files (auto-imported):

```ts
// No import needed
const user = await prismaClient.user.findUnique({ where: { id } })
```

## Service Layer

Business logic lives in services, not API routes.

```ts
// server/services/userService.ts
export const userService = {
  findById: async (id: string): Promise<User | null> => {
    return prismaClient.user.findUnique({ where: { id } })
  },

  create: async (data: CreateUserPayload): Promise<User> => {
    return prismaClient.user.create({ data })
  },
}
```

## JWT Auth

```ts
// server/utils/auth.ts
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
  email: string
  role: string
}

export const generateToken = (user: User): string => {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role }
  return jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '7d' })
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET ?? '') as JwtPayload
}
```

## REST API Conventions

```
GET    /api/users          → List (paginated)
GET    /api/users/:id      → Get one
POST   /api/users          → Create
PATCH  /api/users/:id      → Update
DELETE /api/users/:id      → Delete
```

Response format:

```ts
interface ApiResponse<T> {
  data: T
  meta?: { total: number; page: number; limit: number }
}
```

## NuxtUI v4 Forms

```vue
<script lang="ts" setup>
import { loginSchema, type LoginCredentials } from '~/server/utils/schemas/user'

const state = reactive<LoginCredentials>({ email: '', password: '' })
const isLoading = ref(false)

const handleSubmit = async (): Promise<void> => {
  isLoading.value = true
  try {
    await useAuth().login(state)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UForm :schema="loginSchema" :state="state" class="space-y-4" @submit="handleSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormField>
    <UFormField label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormField>
    <UButton type="submit" :loading="isLoading">Login</UButton>
  </UForm>
</template>

<style lang="scss" scoped>
</style>
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN bun install --production --ignore-scripts

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/bun.lock ./bun.lock
COPY --from=prod-deps /app/node_modules ./node_modules
VOLUME /app/data
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
```

### entrypoint.sh

```bash
#!/bin/sh
set -e
echo "🚀 Prisma deploy is starting..."
bunx prisma migrate deploy
echo "✅ Prisma deploy is done!"
echo "💻 Server is starting..."
exec bun .output/server/index.mjs
```

## ESLint Stylistic Rules

- Single quotes
- No semicolons
- 2-space indent
- Trailing commas in multiline

## Do NOT

- Use `any` or `unknown` – proper types always
- Use `!` non-null assertions – use `??` or proper null checks
- Use Options API
- Skip return types on functions
- Put business logic in API routes (use services)
- Use npm/yarn/pnpm
- Write desktop-first CSS
- Forget `bun i` after type changes in `/shared/types`
- Forget `bun lint` and `bun typecheck` after changes
