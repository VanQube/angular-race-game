# Runs the Node/Express API server. Requires a reachable MongoDB instance
# via the MONGO_URL / MONGO_DB env vars. See ../docker-compose.yml.

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
