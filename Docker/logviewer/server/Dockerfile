FROM golang:1.18-alpine

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir -p esp-connect/js/ui
RUN mkdir -p esp-connect/style
RUN mkdir -p modules
RUN mkdir -p common
RUN mkdir -p modelviewer
RUN mkdir -p logviewer

ADD https://unpkg.com/vis-network/standalone/umd/vis-network.min.js common/vis-network.min.js

ADD js/connect/*.js esp-connect/js/connect/
ADD js/ui/*.js esp-connect/js/ui/
ADD style/*.css esp-connect/style/
ADD Docker/logviewer/server/index.html index.html
ADD Docker/common/startup_http startup
ADD Docker/common/profile_server .profile

ADD go/http/go.mod ./
ADD go/http/go.sum ./

RUN go mod download

ADD go/http/http.go ./

RUN go build -o http

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
