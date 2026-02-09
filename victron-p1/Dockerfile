ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm jq

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
COPY run.sh /
RUN chmod +x /run.sh

CMD ["/run.sh"]
