import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib.pyplot as plt

# -------------------------------------------------------
# 0️⃣ Limit TensorFlow CPU usage (prevents Windows freeze)
# -------------------------------------------------------
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["TF_NUM_INTRAOP_THREADS"] = "2"
os.environ["TF_NUM_INTEROP_THREADS"] = "2"

# -------------------------------------------------------
# 1️⃣ Define dataset paths
# -------------------------------------------------------
train_dir = r"C:\Users\rippl\Downloads\FoodData\FoodData\The Data\manyVegitables\dataset\Train"
test_dir  = r"C:\Users\rippl\Downloads\FoodData\FoodData\The Data\manyVegitables\dataset\Test"

# -------------------------------------------------------
# 2️⃣ Create datasets (smaller batch + image size for CPU)
# -------------------------------------------------------
img_size = (160, 160)
batch_size = 8   # small to reduce RAM load

train_ds = tf.keras.utils.image_dataset_from_directory(
    train_dir, image_size=img_size, batch_size=batch_size, shuffle=True
)
test_ds = tf.keras.utils.image_dataset_from_directory(
    test_dir, image_size=img_size, batch_size=batch_size
)

class_names = train_ds.class_names
num_classes = len(class_names)
print("✅ Detected Classes:", class_names)

# -------------------------------------------------------
# 3️⃣ Optimize pipeline for CPU
# -------------------------------------------------------
AUTOTUNE = tf.data.AUTOTUNE

# small shuffle buffer and low prefetch = low RAM use
train_ds = (
    train_ds
    .cache(filename=".train_cache")   # stores cache on disk; no RAM explosion
    .shuffle(512)
    .prefetch(AUTOTUNE)
)

test_ds = (
    test_ds
    .cache(filename=".test_cache")
    .prefetch(AUTOTUNE)
)

# optional sanity check: ensure dataset loads
for x, y in train_ds.take(1):
    print(f"✅ Loaded one batch: {x.shape}, labels: {y.shape}")

# -------------------------------------------------------
# 4️⃣ Data augmentation
# -------------------------------------------------------
data_augmentation = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.15),
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.15),
], name="augmentation")

# -------------------------------------------------------
# 5️⃣ Build CNN model (balanced for CPU)
# -------------------------------------------------------
def build_large_cnn(input_shape=(160,160,3), num_classes=10):
    inputs = keras.Input(shape=input_shape)

    x = data_augmentation(inputs)
    x = layers.Rescaling(1./255)(x)

    # Block 1
    for f in [32, 64]:
        x = layers.Conv2D(f, (3,3), padding="same")(x)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.2)(x)

    # Block 2
    for f in [128, 128]:
        x = layers.Conv2D(f, (3,3), padding="same")(x)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.3)(x)

    # Block 3
    for f in [256, 256]:
        x = layers.Conv2D(f, (3,3), padding="same")(x)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.4)(x)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    return keras.Model(inputs, outputs)

model = build_large_cnn(input_shape=(160,160,3), num_classes=num_classes)
model.summary()

# -------------------------------------------------------
# 6️⃣ Compile model
# -------------------------------------------------------
optimizer = keras.optimizers.Adam(learning_rate=1e-4)
model.compile(
    optimizer=optimizer,
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

# -------------------------------------------------------
# 7️⃣ Callbacks
# -------------------------------------------------------
early_stop = keras.callbacks.EarlyStopping(
    monitor="val_loss", patience=6, restore_best_weights=True
)
reduce_lr = keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss", factor=0.3, patience=3, min_lr=1e-6
)
checkpoint = keras.callbacks.ModelCheckpoint(
    "manyVegData_CPU_best.keras", save_best_only=True, monitor="val_loss"
)
clr = keras.callbacks.LearningRateScheduler(
    lambda epoch: 1e-4 * (0.5 ** (epoch // 5))
)

# -------------------------------------------------------
# 8️⃣ Train model
# -------------------------------------------------------
epochs = 25
history = model.fit(
    train_ds,
    validation_data=test_ds,
    epochs=epochs,
    callbacks=[early_stop, reduce_lr, checkpoint, clr],
)

# -------------------------------------------------------
# 9️⃣ Save model
# -------------------------------------------------------
model.save("manyVegData_CPU_model.h5")
print("✅ Model saved as manyVegData_CPU_model.h5")

# -------------------------------------------------------
# 🔟 Plot accuracy and loss
# -------------------------------------------------------
acc = history.history["accuracy"]
val_acc = history.history["val_accuracy"]
loss = history.history["loss"]
val_loss = history.history["val_loss"]
epochs_range = range(len(acc))

plt.figure(figsize=(12,5))
plt.subplot(1,2,1)
plt.plot(epochs_range, acc, label="Training Accuracy")
plt.plot(epochs_range, val_acc, label="Validation Accuracy")
plt.legend(loc="lower right")
plt.title("Training vs Validation Accuracy")

plt.subplot(1,2,2)
plt.plot(epochs_range, loss, label="Training Loss")
plt.plot(epochs_range, val_loss, label="Validation Loss")
plt.legend(loc="upper right")
plt.title("Training vs Validation Loss")
plt.show()
