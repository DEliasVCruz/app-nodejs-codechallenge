FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run type-check

# Set environment variables
ENV PORT=3000

ENV KAFKA_BROKERS=kafka:29092

# Expose the port the app runs on
EXPOSE ${PORT}

# Start the application
CMD ["pnpm", "start"] 
