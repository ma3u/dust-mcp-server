# Minimal Dockerfile for Node.js + TypeScript (builds to build/index.js)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
CMD ["node", "build/index.js"]
