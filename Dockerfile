# FROM ghcr.io/puppeteer/puppeteer:23.3.0
FROM node:16-alpine


WORKDIR /usr/src/app
COPY package.json .

RUN npm install
COPY . .
RUN npm run build
CMD [ "node", "dist/app.js" ]





# FROM ghcr.io/puppeteer/puppeteer:23.3.0

# WORKDIR /usr/src

# COPY package*.json ./
# RUN npm ci
# # RUN npm ci  && npm install typescript tsc ts-node && npm run build
# RUN npm install typescript tsc ts-node
# RUN npm run build
# COPY . .

# CMD [ "node", "dist/app.js" ]