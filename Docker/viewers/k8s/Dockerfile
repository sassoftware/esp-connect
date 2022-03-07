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
RUN mkdir -p modelviewer
RUN mkdir -p logviewer

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js
RUN chmod 666 common/vis-network.min.js

ADD js/connect/*.js esp-connect/js/connect
ADD js/connect/package.json esp-connect/js/connect
ADD js/ui/*.js esp-connect/js/ui
ADD style/*.css esp-connect/style
ADD Docker/viewers/k8s/modelviewer.html modelviewer/index.html
ADD Docker/viewers/k8s/logviewer.html logviewer/index.html
ADD dist/esp-connect-ui.js common/esp-connect-ui.js
ADD nodejs/http.mjs http.mjs
ADD Docker/viewers/k8s/config kubeconfig
ADD Docker/viewers/k8s/startup startup
ADD Docker/viewers/common/profile .profile

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl

RUN npm install ${HOME}/esp-connect/js/connect

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
