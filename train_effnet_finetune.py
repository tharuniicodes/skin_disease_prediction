import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import ModelCheckpoint

IMG_SIZE = (224, 224)  # keep this for now
BATCH = 8  # MUST be 8 on Mac

train_ds = keras.utils.image_dataset_from_directory(
    "data_effnet/train",
    image_size=IMG_SIZE,
    batch_size=BATCH,
    label_mode="categorical"
)

val_ds = keras.utils.image_dataset_from_directory(
    "data_effnet/val",
    image_size=IMG_SIZE,
    batch_size=BATCH,
    label_mode="categorical"
)
class_names = train_ds.class_names
num_classes = len(class_names)
train_steps = train_ds.cardinality().numpy()
val_steps = val_ds.cardinality().numpy()

AUTOTUNE = tf.data.AUTOTUNE

# 🔒 Safety: ignore corrupted images first
train_ds = train_ds.ignore_errors()
val_ds = val_ds.ignore_errors()

# 🔥 Memory-safe pipeline for macOS
train_ds = train_ds.repeat()
val_ds = val_ds.repeat()
train_ds = train_ds.shuffle(200).prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)

# 🔥 STRONG augmentation (THIS fixes Chrome issue)
augment = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.15),
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.2),
])

base = keras.applications.EfficientNetB0(
    include_top=False,
    weights="imagenet",
    input_shape=IMG_SIZE + (3,)
)

base.trainable = False  # phase 1

inputs = keras.Input(shape=IMG_SIZE + (3,))
x = augment(inputs)
x = keras.applications.efficientnet.preprocess_input(x)
x = base(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.4)(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)

model = keras.Model(inputs, outputs)

model.compile(
    optimizer=keras.optimizers.Adam(1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

os.makedirs("models", exist_ok=True)

checkpoint = ModelCheckpoint(
    "models/effnet_best.keras",
    monitor="val_accuracy",
    save_best_only=True,
    verbose=1
)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    steps_per_epoch=train_steps,
    validation_steps=val_steps,
    callbacks=[checkpoint],
)

# 🔓 Fine-tune last layers
base.trainable = True
for layer in base.layers[:int(0.7 * len(base.layers))]:
    layer.trainable = False

model.compile(
    optimizer=keras.optimizers.Adam(1e-4),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    steps_per_epoch=train_steps,
    validation_steps=val_steps,
    callbacks=[checkpoint],
)

model.save("models/effnet_finetuned.keras")
print("Model saved successfully")

with open("models/class_names.txt", "w") as f:
    for c in class_names:
        f.write(c + "\n")

print("✅ EfficientNet fine-tuned successfully")
