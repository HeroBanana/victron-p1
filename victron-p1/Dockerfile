ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm jq

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
RUN mkdir -p /etc/services.d/victron-p1
COPY run.sh /etc/services.d/victron-p1/run
COPY finish /etc/services.d/victron-p1/finish
RUN chmod +x /etc/services.d/victron-p1/run /etc/services.d/victron-p1/finish
