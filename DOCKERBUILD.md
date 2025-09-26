# Docker builds

1:33:00

## web

```bash
docker build \
 -t resonate-web \
 -f ./docker/Dockerfile.frontend \
 --build-arg DATABASE_URL=postgres://postgres:postgres@localhost:5432/resonnate \
 .
docker tag resonate-web smnthjm08/resonate-web:latest
docker push smnthjm08/resonate-web:latest
````

## http backend

```bash
docker build -t resonate-http-backend -f ./docker/Dockerfile.http-backend .
docker tag resonate-http-backend smnthjm08/resonate-http-backend:latest
docker push smnthjm08/resonate-http-backend:latest
```

## ws backend

```bash
docker build -t resonate-ws-backend -f ./docker/Dockerfile.ws-backend .
docker tag resonate-ws-backend smnthjm08/resonate-ws-backend:latest
docker push smnthjm08/resonate-ws-backend:latest
```
