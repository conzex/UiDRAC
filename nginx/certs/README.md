# TLS certificates for production nginx

Place these files here before running `bash scripts/vm-prod.sh`:

| File | Description |
|------|-------------|
| `fullchain.pem` | Certificate + chain (Let's Encrypt `fullchain.pem`) |
| `privkey.pem` | Private key |

## Let's Encrypt (recommended, public domain)

On the VM (with ports 80/443 open and DNS pointing to the VM):

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d idrac.yourdomain.com
sudo cp /etc/letsencrypt/live/idrac.yourdomain.com/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/idrac.yourdomain.com/privkey.pem ./nginx/certs/
sudo chown "$USER:$USER" ./nginx/certs/*.pem
```

Set `TLS_CERT_PATH` and `TLS_KEY_PATH` in `.env` if you use different paths.

## Self-signed (lab / private IP)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=idrac.yourdomain.com"
```

Browsers will warn until you trust the certificate.
