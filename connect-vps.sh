#!/bin/bash

VPS_IP="187.77.185.220"
VPS_USER="root"
VPS_PASSWORD="Lookaround@123"
LOCAL_PORT="5433"
REMOTE_PORT="5433"

echo "Starting SSH tunnel to VPS database..."
echo "Local: localhost:$LOCAL_PORT -> Remote: $VPS_IP:$REMOTE_PORT"
echo ""

# Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    pacman -S --noconfirm sshpass 2>/dev/null || apt-get install -y sshpass 2>/dev/null || brew install sshpass 2>/dev/null
    if ! command -v sshpass &> /dev/null; then
        echo "Could not install sshpass. You may need to install it manually."
        exit 1
    fi
fi

ATTEMPT=0
while true; do
    ((ATTEMPT++))
    TIMESTAMP=$(date '+%H:%M:%S')
    echo "[$TIMESTAMP] Attempt $ATTEMPT - Creating SSH tunnel..."
    
    sshpass -p "$VPS_PASSWORD" ssh -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -N -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" \
        "${VPS_USER}@${VPS_IP}"
    
    TIMESTAMP=$(date '+%H:%M:%S')
    if [ $? -eq 0 ]; then
        echo "[$TIMESTAMP] SSH tunnel disconnected. Reconnecting in 5 seconds..."
    else
        echo "[$TIMESTAMP] Connection failed. Retrying in 5 seconds..."
    fi
    
    sleep 5
done
