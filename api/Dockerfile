FROM node:18-slim AS base
WORKDIR /usr/src/app

COPY package*.json ./

# Install all dependencies (tsx is used to run TS at runtime)
RUN npm ci --omit=optional

COPY . .

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["npm", "start"]
