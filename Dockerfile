# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy backend package files
COPY package.json yarn.lock ./

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install dependencies
RUN yarn install --frozen-lockfile

# Install frontend dependencies
RUN cd frontend && npm ci

# Copy source code
COPY . .

# Build frontend and sync assets into backend public directory
RUN npm run build --prefix frontend \
  && mkdir -p public \
  && rm -rf public/assets \
  && rm -f public/index.html \
  && cp -R frontend/dist/. public/

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema
COPY prisma ./prisma

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/src/main"]
