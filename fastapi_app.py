import io
import os

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "effnet_best.keras")
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

class_names = sorted(
    [d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))]
)
model = None


@app.on_event("startup")
def load_model():
    global tf, model
    print("Loading TensorFlow...")
    import tensorflow as tf
    print("TensorFlow loaded")
    model = tf.keras.models.load_model(MODEL_PATH)


def preprocess_image(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)
    arr = tf.keras.utils.img_to_array(image)
    arr = np.expand_dims(arr, axis=0)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return arr


@app.get("/")
def health():
    return {"status": "ok", "message": "FastAPI is running"}


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    contents = await image.read()
    pil_img = Image.open(io.BytesIO(contents))
    x = preprocess_image(pil_img)
    preds = model.predict(x, verbose=0)[0]
    idx = int(np.argmax(preds))
    confidence = float(preds[idx])
    label = class_names[idx] if idx < len(class_names) else str(idx)
    return {"label": label, "confidence": confidence}
