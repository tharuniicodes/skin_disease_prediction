import io
import os

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "effnet_best.keras")
CLASS_NAMES_PATH = os.path.join(PROJECT_ROOT, "models", "class_names.txt")
TRAIN_DIR = os.path.join(PROJECT_ROOT, "data_effnet", "train")
IMG_SIZE = (224, 224)

app = FastAPI(title="Skin Disease Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tf = None
class_names = []
model = None


@app.on_event("startup")
def load_model():
    global tf, model, class_names
    print("Loading TensorFlow...")
    import tensorflow as tf
    print("TensorFlow loaded")
    class_names = load_class_names()
    model = tf.keras.models.load_model(MODEL_PATH)


def preprocess_image(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)
    arr = tf.keras.utils.img_to_array(image)
    arr = np.expand_dims(arr, axis=0)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return arr


def load_class_names() -> list[str]:
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            labels = [line.strip() for line in f if line.strip()]
        if labels:
            return labels

    if os.path.isdir(TRAIN_DIR):
        labels = sorted(
            [d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))]
        )
        if labels:
            return labels

    raise RuntimeError(
        f"No class labels found. Add labels to {CLASS_NAMES_PATH} "
        "or include data_effnet/train directories."
    )


@app.get("/")
def health():
    return {
        "status": "ok",
        "message": "FastAPI is running",
        "model_loaded": model is not None,
        "num_classes": len(class_names),
    }


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if model is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Model is not loaded yet. Try again in a few seconds."},
        )

    contents = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(contents))
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid image file"})

    x = preprocess_image(pil_img)
    preds = model.predict(x, verbose=0)[0]
    idx = int(np.argmax(preds))
    confidence = float(preds[idx])
    label = class_names[idx] if idx < len(class_names) else str(idx)
    return {"label": label, "confidence": confidence}
