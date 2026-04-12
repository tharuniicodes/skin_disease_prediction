import io
import json
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
AUTH_STORE_PATH = os.getenv("AUTH_STORE_PATH", "/tmp/skincare_ai_users.json")
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
auth_store_lock = Lock()


@app.on_event("startup")
def start_background_warmup():
    # Keep startup fast for Render health checks, then warm model in background.
    if not MONGODB_URI:
        print(f"MONGODB_URI is not configured; auth will use local file store: {AUTH_STORE_PATH}")
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
        print(f"MongoDB connection failed; using local file store instead: {exc}")
        return None

def auth_backend_name() -> str:
    if users_collection is not None:
        return "mongodb"
    if MONGODB_URI:
        return "mongodb_or_local_file"
    return "local_file"

def normalize_email(email: str) -> str:
    return email.strip().lower()

def load_file_users() -> list[dict]:
    if not os.path.exists(AUTH_STORE_PATH):
        return []

    try:
        with open(AUTH_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(data, list):
        return []
    return [user for user in data if isinstance(user, dict)]

def save_file_users(users: list[dict]) -> None:
    directory = os.path.dirname(AUTH_STORE_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)

    temp_path = f"{AUTH_STORE_PATH}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    os.replace(temp_path, AUTH_STORE_PATH)

def find_file_user(email: str) -> dict | None:
    normalized_email = normalize_email(email)
    with auth_store_lock:
        for user in load_file_users():
            if normalize_email(user.get("email", "")) == normalized_email:
                return user
    return None

def insert_file_user(user_doc: dict) -> bool:
    normalized_email = normalize_email(user_doc["email"])
    with auth_store_lock:
        users = load_file_users()
        if any(normalize_email(user.get("email", "")) == normalized_email for user in users):
            return False
        users.append(user_doc)
        save_file_users(users)
    return True

def update_file_user_password(email: str, hashed_password: str) -> bool:
    normalized_email = normalize_email(email)
    with auth_store_lock:
        users = load_file_users()
        for user in users:
            if normalize_email(user.get("email", "")) == normalized_email:
                user["password"] = hashed_password
                user["updatedAt"] = datetime.utcnow().isoformat()
                save_file_users(users)
                return True
    return False

def find_auth_user(email: str) -> dict | None:
    collection = get_users_collection()
    normalized_email = normalize_email(email)

    if collection is not None:
        try:
            return collection.find_one({"email": normalized_email})
        except PyMongoError as exc:
            print(f"MongoDB read failed; using local file store instead: {exc}")

    return find_file_user(normalized_email)

def create_auth_user(username: str, email: str, password: str) -> bool:
    collection = get_users_collection()
    normalized_email = normalize_email(email)
    user_doc = {
        "username": username.strip(),
        "email": normalized_email,
        "password": generate_password_hash(password),
        "createdAt": datetime.utcnow().isoformat(),
    }

    if collection is not None:
        try:
            if collection.find_one({"email": normalized_email}):
                return False
            collection.insert_one({**user_doc, "createdAt": datetime.utcnow()})
            return True
        except PyMongoError as exc:
            print(f"MongoDB write failed; using local file store instead: {exc}")

    return insert_file_user(user_doc)

def update_auth_password(email: str, password: str) -> bool:
    collection = get_users_collection()
    normalized_email = normalize_email(email)
    hashed_password = generate_password_hash(password)

    if collection is not None:
        try:
            result = collection.update_one(
                {"email": normalized_email},
                {"$set": {"password": hashed_password, "updatedAt": datetime.utcnow()}},
            )
            return result.matched_count > 0
        except PyMongoError as exc:
            print(f"MongoDB update failed; using local file store instead: {exc}")

    return update_file_user_password(normalized_email, hashed_password)

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
    if find_auth_user(user.email):
        return {"success": False, "message": "User already exists"}

    if not create_auth_user(user.username, user.email, user.password):
        return {"success": False, "message": "User already exists"}

    return {"success": True, "message": "Signup successful"}

@app.post("/login")
async def login(user: UserLogin):
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
    user = find_auth_user(data.email)
    if not user:
        return {"success": False, "message": "Email not registered"}
    return {"success": True, "message": "Email verified"}

@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    if not update_auth_password(data.email, data.password):
        return {"success": False, "message": "Failed to update password"}
    return {"success": True, "message": "Password updated successfully"}

# --- Static File Serving ---
@app.get("/")
def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="static")
