FROM alpine:3.22.0
RUN apk add bash openssh
COPY entry.sh /entry.sh
ENTRYPOINT ["bash", "/entry.sh"]
