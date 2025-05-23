# Build stage
FROM node:20-alpine as build

WORKDIR /app
COPY app/package*.json ./
RUN npm install

COPY app/ .

# Copy resources folder to the appropriate location
COPY resources/ /app/resources/

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]