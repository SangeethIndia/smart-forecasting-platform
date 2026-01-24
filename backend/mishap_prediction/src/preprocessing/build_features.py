import pandas as pd
import sys
from pathlib import Path

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.config import RAW_DATA_DIR, PROCESSED_DATA_DIR

# File Paths
INPUT_FILE = RAW_DATA_DIR / "mishap_aggregated_data.csv"
OUTPUT_FILE = PROCESSED_DATA_DIR / "features.csv"

def build_features():
     # Load Data
     df = pd.read_csv(INPUT_FILE)

     df = df.sort_values(by=['entity_type', 'entity_value', 'year', 'quarter'])

     df = compute_feature_values(df)
     
     # print(df.head(10))

     # Save processed features
     df.to_csv(OUTPUT_FILE, index=False)
     print(f"Feature file saved to {OUTPUT_FILE}")

def compute_feature_values(df):
     # Previous Quarter Mishap Count
     df['prev_qtr_count'] = df.groupby(['entity_type', 'entity_value'])['mishap_count'].shift(1).fillna(0)

     # Quarter-on-quarter change
     df["qoq_change"] = df["mishap_count"] - df["prev_qtr_count"]

     # Rolling 4-quarter average
     df["rolling_4q_avg"] = (
                                   df.groupby(["entity_type", "entity_value"])["mishap_count"]
                                   .rolling(window=4, min_periods=1)
                                   .mean()
                                   .reset_index(level=[0, 1], drop=True)
                                   .fillna(0)
                              )
     
     return df

if __name__ == "__main__":
     build_features()

    