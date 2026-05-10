# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json ./

# Install with legacy-peer-deps as a safety net for Docker builds
RUN npm ci --legacy-peer-deps

# NOW copy source (node_modules excluded via .dockerignore)
COPY . .

# Build args for Vite
ARG VITE_WS_URL=ws://localhost:5001
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
