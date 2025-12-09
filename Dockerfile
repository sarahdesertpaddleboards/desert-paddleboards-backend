# Use official Node runtime
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the backend
RUN pnpm build

# Expose port Railway will map
EXPOSE 8080

# Start the backend
CMD ["node", "dist/index.js"]
