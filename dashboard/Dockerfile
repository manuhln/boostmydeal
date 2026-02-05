# Dashboard Dockerfile
# Multi-stage build for Node.js dashboard with Vite frontend and Express backend

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build frontend (Vite) and backend (esbuild)
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5001

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create uploads directory
RUN mkdir -p uploads && chown -R expressjs:nodejs uploads

# Switch to non-root user
USER expressjs

# Expose the port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
