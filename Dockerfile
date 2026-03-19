# Build stage
FROM node:20-alpine AS build

WORKDIR /build

COPY app/package.json app/package-lock.json ./app/
WORKDIR /build/app
RUN npm ci

WORKDIR /build
COPY app/ ./app/
COPY resources/ ./resources/

WORKDIR /build/app
RUN npm run build

# Production stage
FROM nginx:alpine

# Upgrade system packages to patch known vulnerabilities (zlib CVEs)
RUN apk upgrade --no-cache

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /build/app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]