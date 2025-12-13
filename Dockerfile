FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    bind-tools \
    openssl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S infohub -u 1001

# Change ownership
RUN chown -R infohub:nodejs /app
USER infohub

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/ || exit 1

# Start application
CMD ["node", "packages/frontend/server.js"]