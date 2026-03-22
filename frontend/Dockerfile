# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build Vite project
RUN npm run build

# Nginx production stage
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Nginx default is 80)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
