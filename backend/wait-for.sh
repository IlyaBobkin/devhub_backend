#!/bin/sh
until curl -f http://keycloak:8080/health/ready; do
  echo "Keycloak not ready - sleeping"
  sleep 5
done
echo "Keycloak ready - starting backend"
exec "$@"
