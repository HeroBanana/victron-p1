#!/bin/bash

CONFIG_PATH=/data/options.json
HOMEWIZARD_IP=$(jq -r '.homewizard_ip' $CONFIG_PATH)
POLL_INTERVAL=$(jq -r '.poll_interval' $CONFIG_PATH)

export HOMEWIZARD_IP
export POLL_INTERVAL
export MODBUS_PORT=502
export DEBUG=false

echo "Starting HomeWizard P1 to Victron bridge..."
echo "  HomeWizard IP: $HOMEWIZARD_IP"
echo "  Poll interval: ${POLL_INTERVAL}ms"
echo "  Modbus TCP port: 502"

exec node /app/index.js
