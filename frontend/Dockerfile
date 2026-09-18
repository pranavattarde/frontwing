# Stage 1: Build production static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install full dependencies (including devDependencies needed by Vite)
RUN npm ci

# Copy frontend source code
COPY . .

# Build production bundle to /app/dist
RUN npm run build

# Stage 2: Serve compiled static output via hardened Nginx
FROM nginx:1.27-alpine AS production

# Install wget for container healthchecks
RUN apk add --no-cache wget

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check against dedicated endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
