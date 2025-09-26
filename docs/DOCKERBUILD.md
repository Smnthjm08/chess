# Docker Builds

Web (Frontend)

docker build \
  -t resonate-web \
  -f ./docker/Dockerfile.frontend \
  --build-arg DATABASE_URL=postgres://postgres:postgres@localhost:5432/resonnate \
  .

docker tag resonate-web smnthjm08/resonate-web:latest
docker push smnthjm08/resonate-web:latest

HTTP Backend

docker build -t resonate-http-backend -f ./docker/Dockerfile.http-backend .

docker tag resonate-http-backend smnthjm08/resonate-http-backend:latest
docker push smnthjm08/resonate-http-backend:latest

WS Backend

docker build -t resonate-ws-backend -f ./docker/Dockerfile.ws-backend .
docker tag resonate-ws-backend smnthjm08/resonate-ws-backend:latest

docker push smnthjm08/resonate-ws-backend:latest

Deployment on EC2 / Digital Ocean

Create an EC2 instance / Digital Ocean droplet.

SSH into the machine and install Docker.

Copy your .env.prod file to the server, e.g., /home/ubuntu/env/.env.prod.

Running HTTP Backend
sudo docker run -d \
  --name http-backend \
  --env-file /home/ubuntu/env/.env.prod \
  -p 5001:5001 \
  smnthjm08/resonate-http-backend:latest

This runs the HTTP backend in detached mode, exposing port 5001.

Open port in Security Group (EC2)

Go to EC2 Console → Security Groups → launch-wizard-3 → Inbound rules.

Click Edit inbound rules → Add rule.

Set:

Type: Custom TCP

Port range: 5001

Source: 0.0.0.0/0 (for testing) or your IP (restricted access)

Save.

Now your backend is publicly accessible via http://<EC2_PUBLIC_IP>:5001.
