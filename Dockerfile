FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY apps/api/package*.json ./
RUN npm install --include=dev

# Copy source and build
COPY apps/api/ ./
RUN npx prisma generate && npm run build

CMD ["sh", "-c", "(npx prisma migrate resolve --applied 20260121_telegram_bot 2>/dev/null || true) && npx prisma migrate deploy && node dist/main"]
