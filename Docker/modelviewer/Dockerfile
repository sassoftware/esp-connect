FROM node:16.14.0-alpine

RUN apk add python3
RUN apk add --update make
RUN apk add --update build-base

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p js/connect
RUN mkdir bin
RUN mkdir modules

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js vis-network.min.js
RUN chmod 666 vis-network.min.js

ADD js/connect/*.js js/connect
ADD js/connect/package.json js/connect
ADD Docker/modelviewer/index.html .
ADD dist/esp-connect-ui.js esp-connect-ui.js
ADD nodejs/connect.mjs modules 
ADD nodejs/http.mjs modules 
ADD Docker/modelviewer/startup startup

RUN npm install ${HOME}/js/connect

CMD /bin/ash --login startup
