FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY . .
CMD ["node", "simulators/index.js"]
