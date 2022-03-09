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

ADD js/connect esp-connect/js/connect
ADD nodejs/connect.mjs modules 
ADD nodejs/http.mjs modules 
ADD Docker/common/profile .profile

RUN npm install esp-connect/js/connect/

ENV ENV="${HOME}/.profile"

CMD /bin/ash
