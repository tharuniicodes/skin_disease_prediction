# Deployment Guide (Long-Term)

This project is prepared for production deployment using Docker.

## 1) Push code to GitHub

```bash
git add fastapi_app.py models/class_names.txt requirements-api.txt Dockerfile .dockerignore render.yaml .gitignore README.md DEPLOYMENT.md
git commit -m "Prepare production deployment for FastAPI skin predictor"
git push origin main
```

## 2) Deploy on Render (recommended quick path)

1. Open Render dashboard.
2. Click **New +** -> **Blueprint**.
3. Select this GitHub repository.
4. Render reads `render.yaml` and creates `skin-preprocess-api`.
5. Wait for deploy to finish and open:
   - `https://<your-service>.onrender.com/healthz`

## 3) Keep it stable for years

1. Use a paid instance (`standard`) to avoid sleep and memory crashes.
2. Attach a custom domain (for LinkedIn sharing): `api.yourdomain.com`.
3. Enable domain auto-renew at your domain provider.
4. Set billing alerts in Render and your payment provider.
5. Add uptime monitoring (UptimeRobot or Better Stack) on `/healthz`.

## API endpoint

- `POST /predict`
- `Content-Type`: `multipart/form-data`
- field name: `image`

Example:

```bash
curl -X POST "https://<your-service>.onrender.com/predict" \
  -F "image=@test_images/m.jpeg"
```
