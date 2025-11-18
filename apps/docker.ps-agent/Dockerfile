FROM oven/bun:1.2.21-alpine

LABEL docker.ps-agent="true"

WORKDIR /app

COPY package.json .
COPY bun.lock .

RUN bun install --production

COPY src src
COPY tsconfig.json .
# COPY public public

ENV NODE_ENV=production
CMD ["bun", "src/index.ts"]

EXPOSE 3000
