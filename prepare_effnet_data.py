import os, shutil, random
from pathlib import Path

SRC = Path("data_raw/IMG_CLASSES")
OUT = Path("data_effnet")

random.seed(42)

for split in ["train", "val"]:
    (OUT / split).mkdir(parents=True, exist_ok=True)

for cls in SRC.iterdir():
    if not cls.is_dir():
        continue

    images = list(cls.glob("*.jpg")) + list(cls.glob("*.png"))
    random.shuffle(images)

    split_idx = int(0.8 * len(images))
    train_imgs = images[:split_idx]
    val_imgs = images[split_idx:]

    for img in train_imgs:
        dest = OUT / "train" / cls.name
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / img.name
        if not target.exists():
            os.link(img, target)

    for img in val_imgs:
        dest = OUT / "val" / cls.name
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / img.name
        if not target.exists():
            os.link(img, target)

print("✅ Dataset prepared for EfficientNet fine-tuning")
