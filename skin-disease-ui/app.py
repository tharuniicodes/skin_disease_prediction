import os
import tempfile

from datetime import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask import request, jsonify
from flask import Flask, jsonify, request, send_from_directory
import numpy as np
import tensorflow as tf

# MongoDB connection
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["skincare_ai"]
users_collection = db["users"]

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "skin-disease-frontend")
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "effnet_best.keras")
TRAIN_DIR = os.path.join(PROJECT_ROOT, "data_effnet", "train")
IMG_SIZE = (224, 224)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

class_names = sorted(
    [d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))]
)
model = tf.keras.models.load_model(MODEL_PATH)


def predict_image(path: str) -> tuple[str, float]:
    img = tf.keras.utils.load_img(path, target_size=IMG_SIZE)
    x = tf.keras.utils.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = tf.keras.applications.efficientnet.preprocess_input(x)
    probs = model.predict(x, verbose=0)[0]
    top_idx = int(np.argmax(probs))
    confidence = float(probs[top_idx])
    return class_names[top_idx], confidence


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        label, confidence = predict_image(tmp_path)
        return jsonify({"label": label, "confidence": confidence})
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"success": False, "message": "All fields required"}), 400

    # Check if user already exists
    if users_collection.find_one({"email": email}):
        return jsonify({"success": False, "message": "User already exists"}), 409

    hashed_password = generate_password_hash(password)

    users_collection.insert_one({
        "username": username,
        "email": email,
        "password": hashed_password,
        "health": {},
        "settings": {},
        "createdAt": datetime.utcnow()
    })

    return jsonify({"success": True, "message": "Signup successful"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.json

    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": {
            "username": user["username"],
            "email": user["email"]
        }
    }), 200


@app.route("/health")
def health():
    return {
        "status": "ok",
        "service": "SkinCare AI Backend",
        "database": "connected",
        "timestamp": datetime.now().isoformat()
    }


@app.route("/<path:path>")
def static_files(path: str):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
