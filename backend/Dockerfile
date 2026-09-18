FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install production dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and migrations
COPY src/ ./src/
COPY database/ ./database/

# Switch to non-root node user
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/hero/current || exit 1

CMD ["node", "src/index.js"]
