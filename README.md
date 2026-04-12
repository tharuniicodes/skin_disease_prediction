## 📂 Dataset

The dataset used for this project is hosted on Google Drive:

🔗 https://drive.google.com/drive/folders/1VHqS2UzgTfjilzZbJVIE2TZ4vyFAi4Cf?usp=sharing

Due to GitHub file size limitations (100MB per file), large dataset files are not included in this repository.

### After downloading the dataset:

Place the files inside the following project directories:

- `data_raw/`
- `data_clean/`
- `data_effnet/`
- `features/`

Ensure the folder structure matches the project layout before running training or inference scripts.

## 📎 Kaggle Link

https://www.kaggle.com/datasets/ismailpromus/skin-diseases-image-dataset

## 🚀 Deploy API (Production)

This repo now includes production deployment files for the FastAPI inference API:

- `Dockerfile`
- `.dockerignore`
- `requirements-api.txt`
- `render.yaml`
- `models/class_names.txt`

### Why this matters

Cloud deployment should **not** require the full `data_effnet/` training dataset (~GBs).  
The API loads labels from `models/class_names.txt` in production.

### Quick local run

```bash
pip install -r requirements-api.txt
uvicorn fastapi_app:app --host 0.0.0.0 --port 8000
```

### Render deploy (free option)

1. Push this repo to GitHub.
2. In Render, create a new Blueprint service from this repo.
3. Render auto-detects `render.yaml` and deploys using Docker.
4. Optional: set `MONGODB_URI` in the Render service environment variables.
   Use a MongoDB Atlas connection string or another MongoDB instance reachable from Render if you need persistent auth data across restarts.
5. Use the generated URL:
   - `GET /healthz`
   - `POST /predict` (form-data key: `image`)
   - `POST /signup`
   - `POST /login`

Auth endpoints use MongoDB when `MONGODB_URI` is configured. Without MongoDB, the app falls back to a local JSON user store at `AUTH_STORE_PATH` so signup/login still work for demos. Render's free service filesystem is ephemeral, so those fallback users may be lost after restarts or redeploys.

For long-term availability, keep the service on a paid plan and keep billing active.

Note: Free services on Render spin down after idle time and can restart/suspend due to free-tier limits.
