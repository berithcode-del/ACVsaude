FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 3002
ENV PORT=3002
ENV DB_PATH=/data/acvsaude.db
CMD ["npx", "tsx", "src/index.ts"]
