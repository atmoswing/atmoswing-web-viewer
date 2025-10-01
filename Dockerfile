# atmoswing/web-viewer

# Build React app
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Default command
CMD ["nginx", "-g", "daemon off;"]
