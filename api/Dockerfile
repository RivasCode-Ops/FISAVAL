FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY sql ./sql
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY sql ./sql
RUN mkdir -p uploads data
ENV UPLOADS_DIR=uploads
# JSON DB em /app/data quando não há DATABASE_URL (Render disk montado em data)
EXPOSE 8790
CMD ["node", "dist/index.js"]
