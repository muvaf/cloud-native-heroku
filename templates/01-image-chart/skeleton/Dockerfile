FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production

COPY server.js .
CMD [ "node", "server.js" ]