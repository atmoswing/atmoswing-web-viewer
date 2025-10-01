# atmoswing/web-viewer

# Build stage
FROM node:20-alpine as builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
