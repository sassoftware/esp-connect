FROM alpine:3

RUN apk add python3
RUN apk add --update npm
RUN apk add --update nodejs npm
RUN apk add --update build-base
RUN apk add --update make
RUN apk add --update curl

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p esp-connect/js/connect
RUN mkdir bin
RUN mkdir modules
RUN mkdir .kube

ADD js/connect esp-connect/js/connect
ADD nodejs/connect.mjs modules 
ADD Docker/common/profile .profile
ADD Docker/common/config .kube
ADD Docker/common/startup_k8s startup

RUN curl -sLO https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl bin

RUN npm install esp-connect/js/connect/

ENV ENV="${HOME}/.profile"
ENV KUBECONFIG=${HOME}/.kube/config

CMD /bin/ash --login startup
