# CI/CD Setup

This repository now includes a GitHub Actions workflow at `.github/workflows/deploy-vps.yml`.

## What it does

On every push to `main`, GitHub Actions:

1. Connects to the VPS over SSH.
2. Runs `/opt/horsestable/deploy-vps.sh`.
3. Pulls the latest code on the VPS.
4. Installs dependencies for `backend` and `frontend`.
5. Builds both apps on the VPS.
6. Restarts the `pm2` processes.

## GitHub Secrets

Add these repository or environment secrets in GitHub:

- `VPS_HOST`: VPS public IP or hostname
- `VPS_PORT`: SSH port, usually `22`
- `VPS_USER`: SSH user, usually `root` or a sudo deploy user
- `VPS_SSH_PRIVATE_KEY`: private key for the deploy user
- `VPS_KNOWN_HOSTS`: optional pinned host key output from `ssh-keyscan -H <host>`

## GitHub Variables

Optional repository or environment variables:

- `APP_ROOT`: defaults to `/opt/horsestable`
- `BACKEND_PM2_NAME`: defaults to `horsestable-backend`
- `FRONTEND_PM2_NAME`: defaults to `horsestable-frontend`
- `FRONTEND_PORT`: defaults to `3001`

## One-Time VPS Setup

These items must already exist on the VPS:

- Node.js and npm installed
- `pm2` installed globally
- Project cloned at `/opt/horsestable` or your chosen `APP_ROOT`
- Backend env file present on the server
- Frontend env file present on the server
- Reverse proxy configured to route traffic to the frontend and backend

Typical env file locations:

- `backend/.env`
- `frontend/.env.production`

## Recommended First Deploy

Before relying on automatic deploys, do one manual verification on the VPS:

1. Confirm `bash /opt/horsestable/deploy-vps.sh` succeeds.
2. Confirm `pm2 status` shows both processes online.
3. Confirm the domain serves the frontend and API correctly.

After that, pushes to `main` should deploy automatically.
