FROM quay.io/keycloak/keycloak:23.0.3
COPY config.json /opt/keycloak/data/import/
RUN /opt/keycloak/bin/kc.sh build
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready || exit 1
EXPOSE 8080
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
