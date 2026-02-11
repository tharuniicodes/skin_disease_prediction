import os
import numpy as np
import tensorflow as tf

MODEL_PATH = "models/effnet_best.keras"
TRAIN_DIR = "data_effnet/train"   # must match how you trained
IMG_SIZE = (224, 224)

# ---- class names in the same order Keras used during training (alphabetical) ----
class_names = sorted([
    d for d in os.listdir(TRAIN_DIR)
    if os.path.isdir(os.path.join(TRAIN_DIR, d))
])

print("Class order used for mapping:")
for i, name in enumerate(class_names):
    print(i, "->", name)

# ---- load model ----
model = tf.keras.models.load_model(MODEL_PATH)
print("\nLoaded model:", MODEL_PATH)

def predict_image(path):
    img = tf.keras.utils.load_img(path, target_size=IMG_SIZE)
    x = tf.keras.utils.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = tf.keras.applications.efficientnet.preprocess_input(x)

    probs = model.predict(x, verbose=0)[0]

    top_idx = int(np.argmax(probs))
    confidence = float(probs[top_idx])

    print(class_names[top_idx])

# ✅ Put ONE test image here (we will set it in Step 2)
predict_image("test_images/m.jpeg")
