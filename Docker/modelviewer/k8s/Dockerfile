FROM golang:1.18-alpine

RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir -p esp-connect/js/ui
RUN mkdir -p esp-connect/style

RUN mkdir common
RUN mkdir bin
RUN mkdir .kube

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js

ADD dist/esp-connect-ui.js ./
ADD Docker/modelviewer/k8s/index.html index.html
ADD nodejs/http.mjs modules/http.mjs
ADD Docker/common/config .kube
ADD Docker/common/favicon.ico favicon.ico
ADD Docker/common/startup_k8s_http startup
ADD Docker/common/profile_k8s .profile

ADD go/http/go.mod ./
ADD go/http/go.sum ./

RUN go mod download

ADD go/http/http.go ./

RUN go build -o http

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv kubectl bin

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
