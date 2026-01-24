from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import sys
from pathlib import Path

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.models.predict import get_feature_importance, predict_future_quarters
from src.preprocessing.build_features import build_features
from src.config import MODEL_DIR, PROCESSED_DATA_DIR

app = Flask(__name__)
CORS(app)

# Load historical features ONCE
df_features = pd.read_csv(PROCESSED_DATA_DIR / "features.csv")

@app.route('/predict', methods=['POST'])
def predict():
     data = request.get_json()

     entity_type = data.get('entity_type')
     entity_value = data.get('entity_value')
     n_quarters = int(data.get('n_quarters', 4))

     if not entity_type or not entity_value:
          return jsonify({"error": "entity_type and entity_value are required"}), 400
     
     try:
          preds_df = predict_future_quarters(
                                        df_features=df_features,
                                        entity_type=entity_type,
                                        entity_value=entity_value,
                                        n_quarters=n_quarters
                                   )

          return jsonify({
               "predictions": preds_df.to_dict(orient='records')
          })
     
     except Exception as e:
          return jsonify({"error": str(e)}), 500
     
if __name__ == '__main__':
     app.run(debug=True)