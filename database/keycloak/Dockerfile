FROM quay.io/keycloak/keycloak:23.0.3

WORKDIR /opt/keycloak

COPY config.json /opt/keycloak/data/import/config.json

EXPOSE 8080

ENTRYPOINT ["bin/kc.sh", "start-dev", "--import-realm"]