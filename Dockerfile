# syntax=docker/dockerfile:1

# ---------- Stage 1: build the React client ----------
FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
# Install all deps, including platform-specific optional native binaries that
# Rollup (used by Vite) needs to build. `sharp` is optional and only used for
# icon regeneration; it lands in this throwaway build stage, not the runtime.
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- Stage 2: install production server deps ----------
FROM node:22-slim AS server-build
# Build tools so better-sqlite3 can compile if no prebuilt binary is available.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./

# ---------- Stage 3: runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    CLIENT_DIR=/app/client/dist
WORKDIR /app
COPY --from=server-build /app/server ./server
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/server
CMD ["node", "index.js"]
