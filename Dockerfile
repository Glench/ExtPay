FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY types/ ./types/
COPY test/ ./test/
RUN npx tsc test/types.test.ts --noEmit
RUN npm run build
LABEL types="verified"