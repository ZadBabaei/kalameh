FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY tsconfig.json ./
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "src/server/index.ts"]
