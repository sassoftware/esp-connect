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
RUN mkdir -p modules

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js

ADD js/connect/*.js esp-connect/js/connect/
ADD js/connect/package.json esp-connect/js/connect
ADD js/ui/*.js esp-connect/js/ui/
ADD style/*.css esp-connect/style/
ADD Docker/examples/index.html index.html
ADD Docker/examples/basic basic
ADD Docker/examples/paris paris
ADD Docker/examples/sailing sailing
ADD Docker/examples/trades trades
ADD Docker/examples/turbine turbine
ADD Docker/examples/weather weather
ADD nodejs/http.mjs modules/http.mjs
ADD Docker/common/startup_http startup
ADD Docker/common/profile .profile

RUN npm install ${HOME}/esp-connect/js/connect

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
