FROM node:18-alpine

# Install FFmpeg (required for server-side video composition)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files for backend
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm ci --only=production

# Copy backend code
COPY backend/ ./backend/

# Copy only the frontend assets we need (not the whole frontend)
COPY frontend/public/fonts/ ./frontend/public/fonts/
COPY frontend/public/assets/ ./frontend/public/assets/

# Set working directory to backend
WORKDIR /app/backend

# Expose port (Fly.io convention is 8080)
EXPOSE 8080

# Start server
CMD ["npm", "start"]
