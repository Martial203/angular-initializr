export function buildDockerfile(distPath: string): string {
  return `# --- Stage 1 : build de l'application Angular ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2 : service statique via nginx (non-root, port 8080) ---
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/${distPath} /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
`;
}
