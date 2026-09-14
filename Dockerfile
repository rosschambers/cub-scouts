# syntax=docker/dockerfile:1
# Multi-stage build for cub-scouts

# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: runtime
FROM node:22-alpine AS runtime
WORKDIR /app
# Run as the base image's built-in `node` user (UID/GID 1000, baked into
# node:22-alpine) instead of creating a new one -- it's stable across image
# rebuilds. The bind-mounted signups.json on the host must be chowned to
# 1000:1000 to match (see AGENTS.md).

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/content ./content
COPY --from=build /app/signups.json ./signups.json
COPY --from=build /app/config.json ./config.json

RUN chown -R node:node /app
USER node

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server/server/index.js"]
