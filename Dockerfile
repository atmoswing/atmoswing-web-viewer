# atmoswing/web-viewer

# Build React app
FROM node:20 AS build
WORKDIR /app

# Install deps
COPY package*.json ./
# Installs exactly the versions in package-lock.json, the ones CI tested, so the image is
# reproducible. The lockfile carries the Linux builds of the native packages.
RUN npm ci --no-audit --no-fund

# Build
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
