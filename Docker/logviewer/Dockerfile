FROM nginx:latest

RUN rm -rf /usr/share/nginx/html/*

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js /usr/share/nginx/html/vis-network.min.js
RUN chmod 666 /usr/share/nginx/html/vis-network.min.js

ADD Docker/logviewer/index.html /usr/share/nginx/html/index.html
ADD dist/esp-connect-ui.js /usr/share/nginx/html/esp-connect-ui.js
ADD Docker/common/favicon.ico /usr/share/nginx/html/favicon.ico
