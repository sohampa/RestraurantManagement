# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
RUN addgroup -S nodejs && adduser -S appuser -G nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY data ./data
USER appuser
EXPOSE 30000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:30000/api/v1/health >/dev/null || exit 1
CMD ["node", "src/server.js"]
