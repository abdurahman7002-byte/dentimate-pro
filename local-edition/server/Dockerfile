# provision-server: node stdlib only, no npm dependencies.
# Pin verified 2026-11-25 (hub.docker.com library/node). Test stack ran official Node 26.2.0
# binaries; 26.13.1 is the newest 26.x — re-run provisioner negatives in the Docker session.
FROM node:26.13.1-alpine3.24
WORKDIR /app
COPY provision-server.mjs bootstrap-owner.mjs ./
EXPOSE 9090
USER node
CMD ["node", "provision-server.mjs"]
