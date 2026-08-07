# # Use Node v22 (Alpine)
# FROM node:22-alpine AS base

# # Create and set app directory
# WORKDIR /app

# # Copy pnpm lockfile and package.json first for caching
# COPY pnpm-lock.yaml ./
# COPY package.json ./

# # Install pnpm itself (alpine environment might need additional steps)
# RUN apk add --no-cache curl \
#   && npm install -g pnpm@latest

# # Install dependencies
# RUN pnpm install

# # Copy the rest of the application code
# COPY . .

# # Build the application
# RUN pnpm build

# # Expose port 3000 for main branch
# EXPOSE 3001

# # Expose port 3001 for dev branch
# EXPOSE 3000

# # Stage for main branch deployment
# FROM base AS main
# CMD ["pnpm", "start"]

# # Stage for dev branch deployment
# FROM base AS dev
# CMD ["pnpm", "dev"]

# # Use Node v22 (Alpine)
# FROM node:22-alpine AS base

# # Create and set app directory
# WORKDIR /app

# # Copy pnpm lockfile and package.json first for caching
# COPY pnpm-lock.yaml ./
# COPY package.json ./

# # Install pnpm and deps
# RUN apk add --no-cache curl \
#   && npm install -g pnpm@latest \
#   && pnpm install

# # Copy the rest of the application code
# COPY . .

# # Copy .env into the container
# COPY .env .env

# # Build the application (Next.js uses .env here)
# RUN pnpm build

# # Expose app port
# EXPOSE 3000

# # Run production server
# CMD ["pnpm", "start"]

# Use Node v22 (Alpine)
FROM node:22-alpine AS base

# Accept environment variables as build-time args
ARG NEXT_PUBLIC_BACKENDHOST
ARG NEXT_PUBLIC_API_BASE_URL
ARG USE_NEXT_PROXY

# Set them as environment variables for build-time usage
ENV NEXT_PUBLIC_BACKENDHOST=$NEXT_PUBLIC_BACKENDHOST
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV USE_NEXT_PROXY=$USE_NEXT_PROXY

# Create and set app directory
WORKDIR /app

# Copy pnpm lockfile and package.json first for caching
COPY pnpm-lock.yaml ./
COPY package.json ./

# Install pnpm and dependencies
RUN apk add --no-cache curl \
  && npm install -g pnpm@9.15.4 \
  && pnpm install

# Copy the rest of the application code
COPY . .

# Build the application (uses ENV values above)
RUN pnpm build

# Expose production port
EXPOSE 3000

# Run production server
CMD ["pnpm", "start"]
