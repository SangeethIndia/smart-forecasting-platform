import pandas as pd
import joblib
import sys
from pathlib import Path

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.models.predict import predict_future_quarters
from src.config import PROCESSED_DATA_DIR, MODEL_DIR

# Load historical aggregated data
df = pd.read_csv(PROCESSED_DATA_DIR / "features.csv")

# Load trained model
model = joblib.load(MODEL_DIR / "rf_mishap_model.pkl")

preds = predict_future_quarters(
    df_features=df,
    entity_type="MishapType",
    entity_value="Aviation",
    n_quarters=4,
    w_rf=0.4,
    w_gb=0.6
)

print(preds)

