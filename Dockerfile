FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client ./client
COPY server ./server
COPY tsconfig.json ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/jarnkoll.db

EXPOSE 3000

CMD ["node", "server/index.js"]
