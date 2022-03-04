FROM alpine:3

RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir bin
RUN mkdir ui
RUN mkdir .kube

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js ui
RUN chmod 666 ui/vis-network.min.js

ADD Docker/modelviewer/k8s/index.html ui/index.html
ADD dist/esp-connect-ui.js ui/esp-connect-ui.js
ADD Docker/modelviewer/k8s/config .kube
ADD Docker/common/favicon.ico /usr/share/nginx/html/favicon.ico

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.21.5/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl bin

ENV KUBECONFIG=${HOME}/.kube/config

ENTRYPOINT ["bin/kubectl","proxy","--www=./ui","--www-prefix=/modelviewer","--disable-filter","--address=0.0.0.0"]