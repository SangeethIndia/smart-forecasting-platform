import joblib
import numpy as np
import sys
from pathlib import Path

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.config import MODEL_DIR

class MishapEnsembler:
     def __init__(self):
          self.rf_pipeline = joblib.load(MODEL_DIR / "rf_pipeline.joblib")
          self.gb_pipeline = joblib.load(MODEL_DIR / "gb_pipeline.joblib")
          self.w_rf = 0.4
          self.w_gb = 0.6

     def predict(self, input_df):
          return (
               self.w_rf * self.rf_pipeline.predict(input_df) + 
               self.w_gb * self.gb_pipeline.predict(input_df)
          )

