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
from pymongo.errors import PyMongoError
from werkzeug.security import generate_password_hash, check_password_hash

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "skin-disease-frontend")
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "effnet_best.keras")
CLASS_NAMES_PATH = os.path.join(PROJECT_ROOT, "models", "class_names.txt")
IMG_SIZE = (224, 224)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "skincare_ai")
MONGODB_TIMEOUT_MS = int(os.getenv("MONGODB_TIMEOUT_MS", "5000"))
mongo_client = None
users_collection = None

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
    if not MONGODB_URI:
        print("MONGODB_URI is not configured; auth endpoints will return 503.")
    Thread(target=load_resources, daemon=True).start()

def get_users_collection():
    global mongo_client, users_collection

    if not MONGODB_URI:
        return None

    if users_collection is not None:
        return users_collection

    try:
        mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=MONGODB_TIMEOUT_MS,
            connectTimeoutMS=MONGODB_TIMEOUT_MS,
            socketTimeoutMS=MONGODB_TIMEOUT_MS,
        )
        mongo_client.admin.command("ping")
        users_collection = mongo_client[MONGODB_DB_NAME]["users"]
        return users_collection
    except PyMongoError as exc:
        mongo_client = None
        users_collection = None
        print(f"MongoDB connection failed: {exc}")
        return None

def auth_backend_name() -> str:
    if not MONGODB_URI:
        return "not_configured"
    return "mongodb" if get_users_collection() is not None else "mongodb_unavailable"

def normalize_email(email: str) -> str:
    return email.strip().lower()

def auth_unavailable_response():
    if not MONGODB_URI:
        message = "MongoDB is not configured. Set MONGODB_URI in Render environment variables."
    else:
        message = "MongoDB is unavailable. Check MONGODB_URI and MongoDB network access."
    return JSONResponse(status_code=503, content={"success": False, "message": message})

def get_required_users_collection():
    return get_users_collection()

def find_auth_user(email: str) -> dict | None:
    collection = get_required_users_collection()
    normalized_email = normalize_email(email)
    if collection is None:
        return None

    try:
        return collection.find_one({"email": normalized_email})
    except PyMongoError as exc:
        print(f"MongoDB read failed: {exc}")
        return None

def create_auth_user(username: str, email: str, password: str) -> bool:
    collection = get_required_users_collection()
    normalized_email = normalize_email(email)
    if collection is None:
        return False

    user_doc = {
        "username": username.strip(),
        "email": normalized_email,
        "password": generate_password_hash(password),
        "createdAt": datetime.utcnow(),
    }

    try:
        if collection.find_one({"email": normalized_email}):
            return False
        collection.insert_one(user_doc)
        return True
    except PyMongoError as exc:
        print(f"MongoDB write failed: {exc}")
        return False

def update_auth_password(email: str, password: str) -> bool:
    collection = get_required_users_collection()
    normalized_email = normalize_email(email)
    hashed_password = generate_password_hash(password)
    if collection is None:
        return False

    try:
        result = collection.update_one(
            {"email": normalized_email},
            {"$set": {"password": hashed_password, "updatedAt": datetime.utcnow()}},
        )
        return result.matched_count > 0
    except PyMongoError as exc:
        print(f"MongoDB update failed: {exc}")
        return False

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
    return {"status": "ok", "model_loaded": model is not None, "auth_backend": auth_backend_name()}

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
    if get_required_users_collection() is None:
        return auth_unavailable_response()

    if find_auth_user(user.email):
        return {"success": False, "message": "User already exists"}

    if not create_auth_user(user.username, user.email, user.password):
        return {"success": False, "message": "User already exists"}

    return {"success": True, "message": "Signup successful"}

@app.post("/login")
async def login(user: UserLogin):
    if get_required_users_collection() is None:
        return auth_unavailable_response()

    db_user = find_auth_user(user.email)
    if not db_user or not db_user.get("password") or not check_password_hash(db_user["password"], user.password):
        return {"success": False, "message": "Invalid email or password"}

    return {
        "success": True,
        "data": {
            "success": True,
            "user": {"username": db_user.get("username", ""), "email": db_user["email"]}
        }
    }

@app.post("/forgot-password")
async def forgot_password(data: ForgotPassword):
    if get_required_users_collection() is None:
        return auth_unavailable_response()

    user = find_auth_user(data.email)
    if not user:
        return {"success": False, "message": "Email not registered"}
    return {"success": True, "message": "Email verified"}

@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    if get_required_users_collection() is None:
        return auth_unavailable_response()

    if not update_auth_password(data.email, data.password):
        return {"success": False, "message": "Failed to update password"}
    return {"success": True, "message": "Password updated successfully"}

# --- Static File Serving ---
@app.get("/")
def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="static")
