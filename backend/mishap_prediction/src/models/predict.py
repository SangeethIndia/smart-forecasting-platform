import pandas as pd
from pathlib import Path
import joblib
import sys

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.preprocessing.build_features import build_features
from src.config import MODEL_DIR

MODEL_FEATURES_FILE = MODEL_DIR / "model_features.pkl"

def predict_future_quarters(
          model,
          df_features,
          entity_type,
          entity_value,
          n_quarters=4,
          encoder_columns=None
):
     """
     Predict future quarterly mishap counts using recursive logic. 
     """

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

          # Previous quarter mishap count
          prev_qtr_count = last_row["mishap_count"]

          # Quarter-on-quarter change
          qoq_change = last_row["mishap_count"] - last_row["prev_qtr_count"]

          # Rolling 4-quarter average (use last 3 quarters + current prediction)
          rolling_4q_avg = (
                    current_df["mishap_count"]
                    .tail(4)
                    .mean()
               )

          # Step 6: Build input row for the model
          input_row = {
              "year": next_year,
              "quarter": next_quarter,
              "prev_qtr_count": prev_qtr_count,
              "qoq_change": qoq_change,
              "rolling_4q_avg": rolling_4q_avg,
              "entity_type": entity_type,
              "entity_value": entity_value
          }

          input_df = pd.DataFrame([input_row])

          # Step 7: One-hot encode categorical variables
          input_df_encoded = pd.get_dummies(input_df, columns=['entity_type', 'entity_value'], drop_first=False)

          model_features = joblib.load(MODEL_FEATURES_FILE)

          input_df_encoded = input_df_encoded.reindex(columns=model_features, fill_value=0)

          assert set(input_df_encoded.columns) == set(model_features), "Feature mismatch after encoding"

          # Step 8: Make prediction
          predicted_value = model.predict(input_df_encoded)[0]
          predicted_value = max(0, round(predicted_value))  # Ensure non-negative integer

         # Step 9: Create the next row
          next_row = {
              "year": next_year,
              "quarter": next_quarter,
              "entity_type": entity_type,
              "entity_value": entity_value,
              "mishap_count": predicted_value
          }

          current_df = pd.concat([current_df, pd.DataFrame([next_row])], ignore_index=True)
          future_predictions.append(next_row)
          build_features(current_df)

     importance_df = get_feature_importance(model, model_features)
     return pd.DataFrame(future_predictions), importance_df

def get_feature_importance(model, feature_names):
     return pd.DataFrame({
               'feature': feature_names,
               'importance': model.feature_importances_
          }).sort_values(by='importance', ascending=False)
     