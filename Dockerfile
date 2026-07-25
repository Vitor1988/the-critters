FROM nginx:alpine

# Site estático puro: não há build step, os ficheiros são o artefacto.
COPY index.html rigged.html studio.html engine.js rig-page.js /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
