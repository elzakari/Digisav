# DigiSav via Cloudflare Tunnel (cloudflared)

This exposes DigiSav running on your home server (Proxmox VM) to the internet securely without port-forwarding.

## Option A (Recommended): Named Tunnel + Your Domain

### 1) Prerequisites

- A domain added to Cloudflare DNS (free plan is fine)
- DigiSav running via Docker Compose

### 2) Create the tunnel on the server

Install `cloudflared` OR use the Docker container (recommended here).

Run once on the server:

```bash
docker run --rm -it -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel login
```

This opens a URL. Log in to Cloudflare and authorize.

Create tunnel:

```bash
docker run --rm -it -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel create digisav
```

This creates a credentials JSON file under `./cloudflared/`.

### 3) Configure hostname routing

Edit `cloudflared/config.yml`:

- Replace `digisav.example.com` with your real hostname (e.g. `digisav.yourdomain.com`)
- Keep `service: http://frontend:80` (frontend proxies `/api/v1/*` to backend internally)

Create DNS route (Cloudflare):

```bash
docker run --rm -it -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel route dns digisav digisav.yourdomain.com
```

### 4) Start the tunnel alongside the app

```bash
docker compose up -d --build
docker compose logs -f cloudflared
```

Open:

- `https://digisav.yourdomain.com`

## Option B: Quick Tunnel (No Domain)

This gives you a temporary `trycloudflare.com` URL. Good for demos.

```bash
docker run --rm -it --network digisav_default cloudflare/cloudflared:latest tunnel --url http://frontend:80
```

It prints a public URL. This is not stable and changes when restarted.

## Notes

- No inbound ports are required on your router.
- HTTPS is handled by Cloudflare.
- Make sure migrations run: backend container runs `prisma migrate deploy` on startup.

