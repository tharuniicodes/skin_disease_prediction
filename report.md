# Skin Preprocess CNN Report

## Objective
Classify skin images into their labeled categories using a CNN trained on preprocessed images.

## Dataset Summary
- Input images are resized to 224x224 in `data_clean/images` (or `data_clean_dir/images` if `data_clean` is a file).
- Training and test splits are recorded in `train.csv` and `test.csv` created by `preprocess.py`.
- Class distribution and sample grids are saved by `visualize_dataset.py`.

## Preprocessing
- Resize to 224x224.
- Preserve class labels from folder names.
- Stratified split into train/test.

## Model Architecture
A compact CNN:
- 4 convolutional blocks (32 → 64 → 128 → 256 filters)
- Global average pooling
- Dropout for regularization
- Dense head with softmax for class prediction

## Training Setup
- Optimizer: Adam
- Loss: Sparse categorical cross-entropy
- Validation split from training set
- Early stopping and learning rate reduction

## Evaluation
Artifacts produced by `train_cnn.py` in `artifacts/`:
- `model.keras`
- `metrics.json` (test loss/accuracy)
- `classification_report.json`
- `confusion_matrix.csv`
- `accuracy_curve.png`, `loss_curve.png`

## Results (fill after training)
- Test accuracy: TBD
- Test loss: TBD
- Notes: TBD

## How To Run
1) Preprocess images:
```
python preprocess.py
```
2) Visualize dataset:
```
python visualize_dataset.py
```
3) Train and evaluate:
```
python train_cnn.py
```
