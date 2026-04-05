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

RUN groupadd --system appuser \
    && useradd --system --gid appuser --create-home --home-dir /home/appuser appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app /home/appuser

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/jarnkoll.db

EXPOSE 3000

USER appuser

CMD ["node", "server/index.js"]
