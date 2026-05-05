# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Pass build arguments to environment for Vite
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
# Copy build output to Nginx HTML folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
