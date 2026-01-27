import pandas as pd
from pathlib import Path
from src.config import PROCESSED_DATA_DIR

class DataContext:
     _df_features: pd.DataFrame = None

     @classmethod
     def load(cls):
          if cls._df_features is None:
               cls._df_features = pd.read_csv(PROCESSED_DATA_DIR / "features.csv")


     @classmethod
     def features(cls) -> pd.DataFrame:
          if cls._df_features is None:
               raise RuntimeError("DataContext not initialized. Call DataContext.load() first.")
          return cls._df_features