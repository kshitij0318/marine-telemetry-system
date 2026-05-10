FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY . .
EXPOSE 5001
CMD ["node", "backend/server.js"]
