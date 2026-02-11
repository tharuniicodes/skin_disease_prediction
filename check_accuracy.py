import tensorflow as tf

MODEL_PATH = "models/effnet_best.keras"
VAL_DIR = "data_effnet/val"
IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# load validation data
val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
    label_mode="categorical"
)

# preprocessing (must match training)
val_ds = val_ds.map(
    lambda x, y: (tf.keras.applications.efficientnet.preprocess_input(x), y)
)

# load model
model = tf.keras.models.load_model(MODEL_PATH)

# evaluate
loss, acc = model.evaluate(val_ds, verbose=0)

print(f"Validation Accuracy: {acc*100:.2f}%")
