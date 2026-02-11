import os
import cv2
import pandas as pd
from sklearn.model_selection import train_test_split

# Path to image folders
DATASET_DIR = os.path.join("data_raw", "IMG_CLASSES")
OUTPUT_DIR = "data_clean"

if os.path.isfile(OUTPUT_DIR):
    OUTPUT_DIR = "data_clean_dir"
    print("⚠️  'data_clean' is a file, writing outputs to:", OUTPUT_DIR)

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "images"), exist_ok=True)

IMG_SIZE = 224

image_paths = []
labels = []

# Loop through class folders
for class_name in os.listdir(DATASET_DIR):
    class_path = os.path.join(DATASET_DIR, class_name)

    if not os.path.isdir(class_path):
        continue

    for img_name in os.listdir(class_path):
        img_path = os.path.join(class_path, img_name)

        if img_path.lower().endswith((".jpg", ".png")):
            image = cv2.imread(img_path)
            if image is None:
                continue

            image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
            save_path = os.path.join(OUTPUT_DIR, "images", img_name)

            cv2.imwrite(save_path, image)

            image_paths.append(save_path)
            labels.append(class_name)

# Create dataframe
df = pd.DataFrame({
    "image_path": image_paths,
    "label": labels
})

# Train-test split
train_df, test_df = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["label"]
)

# Save CSVs
train_df.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
test_df.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

print("✅ Preprocessing complete")
print("Train samples:", len(train_df))
print("Test samples:", len(test_df))
