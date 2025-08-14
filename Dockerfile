# syntax=docker/dockerfile:1

# Install dependencies separately to leverage Docker layer caching
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build client and server bundles
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Build: client -> dist/public, server -> dist/index.js
RUN npm run build

# Production runtime image
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV TRUST_PROXY=1

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=build /app/dist ./dist

# Expose the HTTP port
EXPOSE 5000

# Start the server (Express listens on PORT and 0.0.0.0)
CMD ["node", "dist/index.js"]
