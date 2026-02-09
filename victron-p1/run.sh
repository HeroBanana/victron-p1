#!/usr/bin/with-contenv bashio

CONFIG_PATH=/data/options.json
HOMEWIZARD_IP=$(jq -r '.homewizard_ip' $CONFIG_PATH)
POLL_INTERVAL=$(jq -r '.poll_interval' $CONFIG_PATH)

export HOMEWIZARD_IP
export POLL_INTERVAL
export MODBUS_PORT=502
export DEBUG=true

exec node /app/index.js
