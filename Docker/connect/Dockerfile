FROM alpine:3

RUN apk add python3
RUN apk add --update npm
RUN apk add --update nodejs npm
RUN apk add --update build-base
RUN apk add --update make

ENV HOME=/root

WORKDIR ${HOME}

RUN mkdir -p js/connect
RUN mkdir -p modules

ADD js/connect js/connect
ADD nodejs/connect.mjs modules 
ADD Docker/connect/profile .profile

RUN npm install js/connect/

ENV ENV="${HOME}/.profile"

CMD /bin/ash
