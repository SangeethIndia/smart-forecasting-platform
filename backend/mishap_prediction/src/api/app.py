from flask import Flask, app, request, jsonify
from flask_cors import CORS
import pandas as pd
import sys
from pathlib import Path

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.models.predict import get_feature_importance, predict_future_quarters
from src.preprocessing.build_features import build_features
from data.data_context import DataContext
from routes.aggregation_routes import aggregation_bp

def create_app():
     app = Flask(__name__)
     CORS(app)

     DataContext.load()

     app.register_blueprint(aggregation_bp, url_prefix='/api/mishaps')
     return app

app = create_app()

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
                                        df_features=DataContext.features(),
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