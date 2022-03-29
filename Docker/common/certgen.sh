#!/bin/bash

NAME=server
HOST=`hostname -f`

rm -f ${NAME}_key.txt ${NAME}_cert.txt ${NAME}.pem

USER=`echo $USER`

echo "openssl genrsa -out ${NAME}_key.txt 4096"
openssl genrsa -out ${NAME}_key.txt 4096

echo "openssl req -new -x509 -key ${NAME}_key.txt -out ${NAME}_cert.txt -days 365"

printf "US\nNC\nCary\nSAS\nESP\n${HOST}\n${USER}\n" | openssl req -new -x509 -key ${NAME}_key.txt -out ${NAME}_cert.txt -days 365

cat ${NAME}_cert.txt ${NAME}_key.txt > ${NAME}.pem
printf "sasesp\nsasesp\n" | openssl pkcs12 -export -out ${NAME}.p12 -in ${NAME}_cert.txt -inkey ${NAME}_key.txt -passin stdin -passout stdin

rm -f ${NAME}_key.txt ${NAME}_cert.txt

printf "\n\n"

echo certificates ${NAME}.pem and ${NAME}.p12 created

printf "\n\n"
