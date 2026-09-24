export const NGINX_CONF = String.raw`worker_processes auto;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    server_tokens off;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types application/javascript application/json application/xml text/css text/plain text/xml image/svg+xml application/manifest+json;

    server {
        listen 8080;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # HTML / Application entry files
        location ~* (index\.html|ngsw\.json|manifest\.webmanifest)$ {
            include /etc/nginx/security-headers.conf;
            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
            expires off;
            try_files $uri $uri/ /index.html;
        }

        # SPA Fallback (Angular Routing)
        location / {
            include /etc/nginx/security-headers.conf;
            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
            try_files $uri $uri/ /index.html;
        }

        # CSS and JavaScript files
        location ~* \.(?:css|js)$ {
            include /etc/nginx/security-headers.conf;
            add_header Cache-Control "public, max-age=31536000, immutable" always;
            expires 1y;
            access_log off;
        }

        # Static assets (Images, Fonts, Icons)
        location ~* \.(?:gif|jpe?g|png|woff2?|eot|ttf|svg|ico)$ {
            include /etc/nginx/security-headers.conf;
            add_header Cache-Control "public, max-age=15552000" always;
            expires 6M;
            access_log off;
        }
    }
}
`;
