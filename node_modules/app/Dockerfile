## Build stage
FROM node:18 AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

## Production stage
FROM nginx:stable-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copy a minimal nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
