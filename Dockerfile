FROM nginx:alpine

# Site estático puro: não há build step, os ficheiros são o artefacto.
COPY index.html rigged.html studio.html engine.js rig-page.js /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# onde ficam as preferências sincronizadas (montar um volume aqui)
RUN mkdir -p /var/lib/critters && chown -R nginx:nginx /var/lib/critters

EXPOSE 80
