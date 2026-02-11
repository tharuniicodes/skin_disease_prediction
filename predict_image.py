import numpy as np
import joblib
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.applications.efficientnet import preprocess_input
from tensorflow.keras.preprocessing.image import load_img, img_to_array

# Load trained XGBoost model
model = joblib.load("models/final_xgboost_efficientnet.pkl")

# Load EfficientNet feature extractor
cnn = EfficientNetB0(
    weights="imagenet",
    include_top=False,
    pooling="avg"
)

# Class labels (same order as training)
class_names = [
    "Eczema",
    "Warts / Viral Infections",
    "Melanoma",
    "Atopic Dermatitis",
    "Basal Cell Carcinoma",
    "Melanocytic Nevi",
    "Benign Keratosis-like Lesions",
    "Psoriasis / Lichen Planus",
    "Seborrheic Keratoses",
    "Fungal Infections"
]

def predict_image(image_path):
    img = load_img(image_path, target_size=(224, 224))
    x = img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)

    features = cnn.predict(x, verbose=0)
    pred = model.predict(features)[0]

    print("Predicted Disease:", class_names[pred])

# CHANGE IMAGE PATH HERE
predict_image("test_images/image.png")


