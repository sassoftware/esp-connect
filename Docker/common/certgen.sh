#!/bin/bash

NAME=server
HOST=`hostname -f`

rm -f ${NAME}_key.pem ${NAME}_cert.pem ${NAME}.pem

USER=`echo $USER`

echo "openssl genrsa -out ${NAME}_key.pem 4096"
openssl genrsa -out ${NAME}_key.pem 4096

echo "openssl req -new -x509 -key ${NAME}_key.pem -out ${NAME}_cert.pem -days 365"

printf "US\nNC\nCary\nSAS\nESP\n${HOST}\n${USER}\n" | openssl req -new -x509 -key ${NAME}_key.pem -out ${NAME}_cert.pem -days 365

cat ${NAME}_cert.pem ${NAME}_key.pem > ${NAME}.pem

rm -f ${NAME}_key.pem ${NAME}_cert.pem

printf "\n\n"

echo certificate ${NAME}.pem created

printf "\n\n"
