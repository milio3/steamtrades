FROM nginx:alpine

# Copiar archivos estáticos del frontend
COPY src/ /usr/share/nginx/html/static/
COPY src/index.html /usr/share/nginx/html/index.html
COPY src/table.html /usr/share/nginx/html/table.html

# Configuración de Nginx para servir frontend y proxy a backend
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
    location = /table { \
        root /usr/share/nginx/html; \
        try_files /table.html =404; \
    } \
    location = /favicon.ico { \
        alias /usr/share/nginx/html/static/favicon.svg; \
    } \
    location /static/ { \
        alias /usr/share/nginx/html/static/; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
