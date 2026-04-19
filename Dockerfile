# syntax=docker/dockerfile:1

# ---- Build stage: compile TypeScript ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (including dev for TypeScript) with a BuildKit cache mount
COPY package.json package-lock.json tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# Copy source and produce dist/
COPY src ./src
RUN npm run build


# ---- Runtime stage: lean production image ----
FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY bling.json.example ./

# Production-only deps; --ignore-scripts blocks any postinstall hooks in the
# dependency tree from executing during the image build (supply-chain safety).
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --omit-dev

# Stdio MCP server — reads JSON-RPC on stdin, writes on stdout.
# No port to expose and no HTTP server; clients launch the container as a
# child process and talk to it over its stdio streams.
ENTRYPOINT ["node", "/app/dist/index.js"]
