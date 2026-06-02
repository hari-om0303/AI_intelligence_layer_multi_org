# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Set VITE_API_URL to empty to use relative paths in production
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: Build the backend and run the unified service
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy frontend static build from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose backend port (express server runs on 5000)
EXPOSE 5000

# Set start command
CMD ["node", "backend/src/server.js"]
