# ----------- Stage 1: Builder -----------
# Install Node.js dependencies and prepare the application code
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# ----------- Stage 2: Production -----------
# Create a clean, secure production image
FROM node:20-alpine

# Install required system dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    ffmpeg \
    libva \
    libdrm \
    mesa-dri-gallium \
    mesa-va-gallium \
    libva-intel-driver \
    pciutils \
    su-exec \
    dumb-init \
    tzdata

# Create a non-root user and group for security
RUN addgroup -S videra && adduser -S videra -G videra

# Set main working directory for the app
WORKDIR /home/app/videra

# Copy production files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Make entrypoint script executable
RUN chmod +x ./entrypoint.sh

# Set ownership of the app directory to the non-root user
# This is crucial so the user can create symlinks inside it if needed later
RUN chown -R videra:videra /home/app/videra

# Expose application port
EXPOSE 3000

# Set entrypoint script. It will run as root by default.
ENTRYPOINT ["/home/app/videra/entrypoint.sh"]
CMD ["node", "src/index.js"]
