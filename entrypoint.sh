#!/bin/sh

set -e

APP_DIR="/home/app/videra"

# Create persistent data directories at the root level
mkdir -p /uploads
mkdir -p /compressed
mkdir -p /logs

# Create symbolic links from the app's internal paths to the persistent volumes
ln -sfn /uploads ${APP_DIR}/uploads
ln -sfn /compressed ${APP_DIR}/compressed
ln -sfn /logs ${APP_DIR}/logs

# Set ownership for the persistent data directories
chown -R videra:videra /uploads
chown -R videra:videra /compressed
chown -R videra:videra /logs

# Grant GPU access to the videra user
if [ -d "/dev/dri" ]; then
    chown -R videra:videra /dev/dri
fi

# Execute the main command using dumb-init and su-exec
exec /usr/bin/dumb-init -- su-exec videra "$@"