FROM nginx:alpine

# Generate self-signed SSL certificate at build time
RUN if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache openssl wget; \
    elif command -v apt-get >/dev/null 2>&1; then \
      apt-get update \
      && apt-get install -y --no-install-recommends openssl wget \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      echo "Unsupported base image: neither apk nor apt-get found"; \
      exit 1; \
    fi \
  && mkdir -p /etc/nginx/ssl \
  && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/nginx/ssl/nginx.key \
     -out /etc/nginx/ssl/nginx.crt \
     -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 443 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- --no-check-certificate https://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
