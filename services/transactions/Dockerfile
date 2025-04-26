FROM node:20-alpine

WORKDIR /app

# Install io-uring packages in the docker machine
RUN apk add --no-cache \
    gcc \
    musl-dev \
    linux-headers \
    liburing-dev

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
ENV PORT=3002
ENV KAFKA_BROKERS=localhost:9092
ENV TB_ADDRESS=4000

# Expose the port the app runs on
EXPOSE ${PORT}

# Start the application
CMD ["pnpm", "start"] 
