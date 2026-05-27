# 🚀 Deployment Guide

## Local Development

```bash
# Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m backend.database.db --init
uvicorn backend.app:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Docker (single-host)

```bash
docker-compose up --build -d
docker-compose logs -f backend
```

## Render

1. Push to GitHub
2. New → Blueprint → point at `deployment/render.yaml`
3. Render provisions PostgreSQL + builds the Dockerfile
4. Backend live at `https://quantumstock-api.onrender.com`

## Railway

```bash
railway login
railway init
railway up
railway domain   # generates a public URL
```

## Vercel (frontend only)

```bash
cd frontend
vercel --prod
# Set VITE_API_BASE_URL env var pointing at your backend
```

## AWS (ECS Fargate, optional)

1. Build & push image: `docker build -t quantumstock . && docker tag … && docker push ECR_URL`
2. Create ECS Task Definition (1 vCPU / 2 GiB), expose port 8000
3. Create ALB target group, attach Fargate service
4. Use RDS PostgreSQL for `DATABASE_URL`
5. Store secrets in AWS Secrets Manager and inject via Task Definition

## Production Checklist

- [ ] Rotate `JWT_SECRET`
- [ ] Switch to PostgreSQL (`DATABASE_URL`)
- [ ] Enable HTTPS (ALB / Cloudflare)
- [ ] Configure CORS allowlist (not `*`)
- [ ] Run `python -m backend.ml.train` once or schedule weekly cron
- [ ] Enable rate limiting (slowapi)
- [ ] Add Sentry / Datadog for error monitoring
- [ ] Set up daily DB backups
- [ ] CDN-cache `/static/` assets
