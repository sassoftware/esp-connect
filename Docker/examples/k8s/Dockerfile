FROM golang:1.18-alpine

RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir -p esp-connect/js/ui
RUN mkdir -p esp-connect/style
RUN mkdir -p common
RUN mkdir -p modules
RUN mkdir -p .kube
RUN mkdir -p modelviewer
RUN mkdir -p logviewer
RUN mkdir -p bin

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js

ADD js/connect/*.js esp-connect/js/connect/
ADD js/connect/package.json esp-connect/js/connect/
ADD js/ui/*.js esp-connect/js/ui/
ADD style/*.css esp-connect/style/
ADD Docker/examples/index.html index.html
ADD Docker/examples/basic basic
ADD Docker/examples/paris paris
ADD Docker/examples/sailing sailing
ADD Docker/examples/trades trades
ADD Docker/examples/turbine turbine
ADD Docker/examples/weather weather
ADD Docker/examples/common/config.json config.json
ADD Docker/common/startup_k8s_http startup
ADD Docker/common/profile_k8s .profile
ADD Docker/common/config .kube/config

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl bin

ADD go/http/go.mod ./
ADD go/http/go.sum ./

RUN go mod download

ADD go/http/http.go ./

RUN go build -o http

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
