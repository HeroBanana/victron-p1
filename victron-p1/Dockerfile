ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm jq

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
COPY run.sh /etc/services.d/victron-p1/run
RUN chmod +x /etc/services.d/victron-p1/run
