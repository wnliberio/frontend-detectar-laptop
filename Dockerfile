# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# (Opcional) si tienes dependencias nativas, descomenta:
# RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

ARG REACT_APP_LOGIN_URL
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_LOGIN_URL=$REACT_APP_LOGIN_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN chmod -R a+rx node_modules/.bin || true
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health >/dev/null || exit 1
