ARG API_BACKEND_URL=http://backend:8000

# ---- Build stage ----
FROM node:22-alpine AS builder

ARG API_BACKEND_URL
ENV API_BACKEND_URL=$API_BACKEND_URL

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

ARG API_BACKEND_URL
ENV API_BACKEND_URL=$API_BACKEND_URL

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

CMD ["npm", "run", "start"]
