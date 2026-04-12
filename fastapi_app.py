import io
import os
from datetime import datetime
from threading import Lock, Thread

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from PIL import Image
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "skin-disease-frontend")
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "effnet_best.keras")
CLASS_NAMES_PATH = os.path.join(PROJECT_ROOT, "models", "class_names.txt")
IMG_SIZE = (224, 224)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
client = MongoClient(MONGODB_URI)
db = client["skincare_ai"]
users_collection = db["users"]

app = FastAPI(title="Skin Disease Predictor & Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ML Setup
tf = None
class_names = []
model = None
model_load_error = None
model_lock = Lock()


@app.on_event("startup")
def start_background_warmup():
    # Keep startup fast for Render health checks, then warm model in background.
    Thread(target=load_resources, daemon=True).start()

def load_resources() -> tuple[bool, str | None]:
    global tf, model, class_names, model_load_error

    if model is not None:
        return True, None

    with model_lock:
        if model is not None:
            return True, None

        try:
            if tf is None:
                print("Loading TensorFlow...")
                import tensorflow as tensorflow_mod
                tf = tensorflow_mod
                print("TensorFlow loaded")

            class_names = load_class_names()
            model = tf.keras.models.load_model(MODEL_PATH)
            model_load_error = None
            print("Resources loaded successfully")
            return True, None
        except Exception as exc:
            model_load_error = str(exc)
            return False, model_load_error

def load_class_names() -> list[str]:
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    return ["Unknown"]

def preprocess_image(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB").resize(IMG_SIZE)
    arr = tf.keras.utils.img_to_array(image)
    arr = np.expand_dims(arr, axis=0)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return arr

# --- Auth Models ---
class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    password: str

# --- API Endpoints ---

@app.get("/healthz")
def healthz():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    loaded, error = load_resources()
    if not loaded:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Model failed to load on this instance.",
                "details": error,
            },
        )
    
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents))
        x = preprocess_image(pil_img)
        preds = model.predict(x, verbose=0)[0]
        idx = int(np.argmax(preds))
        return {"label": class_names[idx], "confidence": float(preds[idx])}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@app.post("/signup")
async def signup(user: UserSignup):
    if users_collection.find_one({"email": user.email}):
        return {"success": False, "message": "User already exists"}
    
    hashed_password = generate_password_hash(user.password)
    users_collection.insert_one({
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "createdAt": datetime.utcnow()
    })
    return {"success": True, "message": "Signup successful"}

@app.post("/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not check_password_hash(db_user["password"], user.password):
        return {"success": False, "message": "Invalid email or password"}
    
    return {
        "success": True, 
        "data": {
            "success": True,
            "user": {"username": db_user["username"], "email": db_user["email"]}
        }
    }

@app.post("/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = users_collection.find_one({"email": data.email})
    if not user:
        return {"success": False, "message": "Email not registered"}
    return {"success": True, "message": "Email verified"}

@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    hashed_password = generate_password_hash(data.password)
    result = users_collection.update_one({"email": data.email}, {"$set": {"password": hashed_password}})
    if result.modified_count == 0:
        return {"success": False, "message": "Failed to update password"}
    return {"success": True, "message": "Password updated successfully"}

# --- Static File Serving ---
@app.get("/")
def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="static")
