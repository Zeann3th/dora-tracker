# Stage 1
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/bin ./bin
COPY --from=build /app/public ./public
COPY --from=build /app/google.json ./google.json
COPY package*.json ./

RUN npm install --only=production

EXPOSE 5000

ENV NODE_ENV production

CMD ["node", "bin/index.js"]
