# Stage 1: Build the Next.js application
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Set up the production environment
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the built Next.js application from the previous stage
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public

# Copy the server file
COPY server.js .

# Expose the ports for Next.js and Socket.IO server
EXPOSE 3000 3001

# Start the application
CMD ["npm", "start"]

