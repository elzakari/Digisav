# DigiSav on Proxmox (Home Server)

This guide deploys DigiSav using Docker Compose inside a Proxmox VM (recommended) or LXC.

## 1) Proxmox VM (Recommended)

- OS: Debian 12 or Ubuntu 22.04+
- Resources (typical home setup): 2 vCPU, 4–8 GB RAM, 30+ GB disk
- Network: bridge to your LAN (so you get a LAN IP)

## 2) Install Docker + Compose

On the VM:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

## 3) Clone the repo

```bash
mkdir -p /opt/digisav
cd /opt/digisav
git clone https://github.com/elzakari/Digisav.git .
```

## 4) Create production `.env`

Create `/opt/digisav/.env`:

```bash
POSTGRES_USER=digisav
POSTGRES_PASSWORD=CHANGE_ME_STRONG
POSTGRES_DB=digisav

JWT_SECRET=CHANGE_ME_STRONG_RANDOM
FRONTEND_PORT=5173
```

Generate strong secrets:

```bash
openssl rand -hex 32
```

## 5) Start containers

```bash
docker compose up -d --build
```

Notes:
- Frontend is served by Nginx in the `frontend` container.
- API requests to `/api/v1/*` are proxied by `frontend/nginx.conf` to the backend container.
- Backend container runs `prisma migrate deploy` on startup (includes notifications table migration).

## 6) Access

- Open: `http://<your-vm-lan-ip>:5173/`

## 7) Health checks

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

## 8) Backups (important)

Persisted data lives in Docker volumes:

- `digisav_db_data` (Postgres)
- `digisav_redis_data` (Redis)

In Proxmox, the simplest approach is:
- Back up the VM disk regularly, or
- Back up the Docker volumes directory (if you store them on a dedicated disk).

## LXC option (advanced)

If you insist on LXC:
- Enable `nesting=1` (and usually `keyctl=1`) for Docker.
- VM is still safer and easier for Docker in most Proxmox home labs.

