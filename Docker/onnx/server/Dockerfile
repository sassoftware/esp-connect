FROM node:16.14.0-alpine

RUN apk add python3
RUN apk add --update make
RUN apk add --update build-base
RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir -p esp-connect/js/ui
RUN mkdir -p esp-connect/style
RUN mkdir -p common
RUN mkdir -p publisher
RUN mkdir -p viewer

ADD "https://cdn.plot.ly/plotly-latest.min.js" common/plotly-min.js
#RUN chmod 666 common/plotly.js

ADD "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js" common/vis-network.min.js
#RUN chmod 666 common/vis-network.min.js

ADD "https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" common/google-icons.css

ADD js/connect/*.js esp-connect/js/connect
ADD js/connect/package.json esp-connect/js/connect
ADD js/ui/*.js esp-connect/js/ui
ADD style/*.css esp-connect/style
ADD Docker/onnx/server/publisher.html publisher/index.html
ADD Docker/onnx/server/viewer.html viewer/index.html
ADD nodejs/http.mjs modules/http.mjs
ADD Docker/common/server.pem server.pem
ADD Docker/common/startup_http_secure startup
ADD Docker/common/profile .profile

RUN npm install ${HOME}/esp-connect/js/connect

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
