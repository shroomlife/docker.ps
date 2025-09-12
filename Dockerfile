FROM oven/bun:1.2.21-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV NODE_ENV=production
ENV NUXT_PUBLIC_ENVIRONMENT=production

RUN bun run build

FROM oven/bun:1.2.21-alpine AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production --ignore-scripts

FROM oven/bun:1.2.21-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_PUBLIC_ENVIRONMENT=production

COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/bun.lock ./bun.lock
COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
