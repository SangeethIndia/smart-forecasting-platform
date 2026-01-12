from pathlib import Path

# Base Project Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Data Paths
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

# Model Paths
MODEL_DIR = BASE_DIR / "models"

RANDOM_FOREST_MODEL_PATH = MODEL_DIR / "random_forest_v1.joblib"
XGBOOST_MODEL_PATH = MODEL_DIR / "xgboost_v1.joblib"