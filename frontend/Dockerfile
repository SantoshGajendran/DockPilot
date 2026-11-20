# Stage 1: Build Angular static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production --base-href /dockpilot/

# Stage 2: Runtime Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/dockpilot-frontend/browser/. /usr/share/nginx/html/
RUN ln -s /usr/share/nginx/html /usr/share/nginx/html/dockpilot
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
