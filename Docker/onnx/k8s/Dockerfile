FROM golang:1.18-alpine

RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir -p esp-connect/js/ui
RUN mkdir -p esp-connect/style

RUN mkdir common
RUN mkdir bin
RUN mkdir models
RUN mkdir .kube

ADD js/connect/*.js esp-connect/js/connect/
ADD js/connect/package.json esp-connect/js/connect/
ADD js/ui/*.js esp-connect/js/ui/
ADD style/*.css esp-connect/style/
ADD Docker/onnx/k8s/tmp/index.html index.html
ADD Docker/onnx/k8s/tmp/publisher.html publisher.html
ADD Docker/onnx/k8s/tmp/viewer.html viewer.html
ADD Docker/onnx/k8s/onnx onnx
ADD Docker/common/config .kube
ADD Docker/common/favicon.ico favicon.ico
ADD Docker/common/generate_cert.go generate_cert.go
ADD Docker/onnx/k8s/tmp/simple.yaml models/simple.yaml
ADD Docker/onnx/k8s/tmp/onnx.yaml models/onnx.yaml
ADD Docker/onnx/k8s/tmp/startup startup
ADD Docker/common/profile_k8s .profile

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv kubectl bin

ADD go/http/go.mod ./
ADD go/http/go.sum ./

RUN go mod download

ADD go/http/http.go ./

RUN go build -o http

RUN go mod download

RUN go run generate_cert.go -host `hostname`

ENV ENV="${HOME}/.profile"

CMD /bin/ash --login startup
