FROM nginx:alpine

# Copiar archivos estáticos del frontend
COPY src/ /usr/share/nginx/html/static/
COPY src/index.html /usr/share/nginx/html/index.html
COPY src/table.html /usr/share/nginx/html/table.html

# Configuración de Nginx para servir frontend y proxy a backend
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index table.html index.html; \
    location / { \
        try_files $uri $uri/ /table.html; \
    } \
    location = /table { \
        try_files /table.html =404; \
    } \
    location = /table.html { \
        try_files /table.html =404; \
    } \
    location = /cards { \
        try_files /index.html =404; \
    } \
    location = /index.html { \
        try_files /index.html =404; \
    } \
    location = /favicon.ico { \
        alias /usr/share/nginx/html/static/favicon.svg; \
    } \
    location /static/ { \
        alias /usr/share/nginx/html/static/; \
        add_header Cache-Control "no-cache, must-revalidate"; \
    } \
    location /api { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
