import pandas as pd
from pathlib import Path
import sys

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.models.ensemble import MishapEnsembler
from src.preprocessing.build_features import compute_feature_values
from src.config import MODEL_DIR

MODEL_FEATURES_FILE = MODEL_DIR / "model_features.pkl"

def predict_future_quarters(
          df_features,
          entity_type,
          entity_value,
          n_quarters=4,
          w_rf=0.3, 
          w_gb=0.7
):
     """
     Predict future quarterly mishap counts using recursive logic. 
     """
     ensembler = MishapEnsembler(w_rf, w_gb)

     # Step 1: Filter historical data for the given entity
     base_df = df_features.copy()

     entity_df = base_df[
          (df_features['entity_type'] == entity_type) & 
          (df_features['entity_value'] == entity_value)
     ].sort_values(by=['year', 'quarter']).copy()

     if entity_df.empty:
          raise ValueError(f"No data found for entity_type: {entity_type}, entity_value: {entity_value}")
     
     # Step 2: Initialize recursion state
     current_df = entity_df.copy()
     future_predictions = []

     # Step 3: Recursive forecasting loop
     for _ in range(n_quarters):
          # Get the last known (predicted) row
          last_row = current_df.iloc[-1]

          # Step 4: Determine next year and quarter
          if last_row["quarter"] == 4:
            next_year = last_row["year"] + 1
            next_quarter = 1
          else:
            next_year = last_row["year"]
            next_quarter = last_row["quarter"] + 1

          # Step 5: Compute feature values
          input_row = {
               "entity_type": entity_type,
               "entity_value": entity_value,
               "year": next_year,
               "quarter": next_quarter,
               "prev_qtr_count": last_row["mishap_count"],
               "qoq_change": 0, # This is what will be predicted by our model
               "rolling_4q_avg": current_df["mishap_count"].tail(4).mean()
          }

          input_df = pd.DataFrame([input_row])

          # Predict qoq change (Pipeline predicts the delta in mishap count)

          qoq_change = ensembler.predict(input_df)[0]

          # Convert back to absolute mishap count
          predicted_mishap_count = last_row["mishap_count"] + qoq_change
          predicted_mishap_count = max(0, round(predicted_mishap_count))

          next_row = {
              "year": next_year,
              "quarter": next_quarter,
              "entity_type": entity_type,
              "entity_value": entity_value,
              "mishap_count": predicted_mishap_count
          }

          current_df = pd.concat([current_df, pd.DataFrame([next_row])], ignore_index=True)
          current_df = compute_feature_values(current_df)
          future_predictions.append(next_row)

     return pd.DataFrame(future_predictions)

def get_feature_importance(pipeline, feature_names):
     model = pipeline.named_steps['model']
     importances = model.feature_importances_

     feature_names = (pipeline.named_steps['preprocess']
                              .get_feature_names_out())
     
     return pd.DataFrame({
               'feature': feature_names,
               'importance': importances
          }).sort_values(by='importance', ascending=False)
     