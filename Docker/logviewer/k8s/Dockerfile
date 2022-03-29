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
RUN mkdir -p bin
RUN mkdir -p .kube
RUN mkdir -p common

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js

ADD js/connect/*.js esp-connect/js/connect/
ADD js/connect/package.json esp-connect/js/connect/
ADD js/ui/*.js esp-connect/js/ui/
ADD style/*.css esp-connect/style/
ADD Docker/logviewer/k8s/index.html index.html
ADD nodejs/http.mjs modules/http.mjs
ADD Docker/common/config .kube
ADD Docker/common/startup_k8s_http startup
ADD Docker/common/profile_k8s .profile

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv kubectl bin

RUN npm install ${HOME}/esp-connect/js/connect

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
