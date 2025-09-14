FROM oven/bun:1.2.21-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV NODE_ENV=production
ENV NUXT_PUBLIC_ENVIRONMENT=production

RUN bun run db:generate
RUN bun run build

FROM oven/bun:1.2.21-alpine AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY --from=builder /app/prisma ./prisma

RUN bun install --production --ignore-scripts

FROM oven/bun:1.2.21-alpine AS runtime

LABEL docker.ps.self="true"

WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_PUBLIC_ENVIRONMENT=production

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/bun.lock ./bun.lock
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy and set entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
