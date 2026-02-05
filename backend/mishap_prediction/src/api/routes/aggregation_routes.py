from flask import Blueprint, request, jsonify
from src.config import PROCESSED_DATA_DIR
from data.data_context import DataContext
from src.services.prediction_service import get_dynamic_aggregation, get_quarterly_prediction, get_yearwise_trend
from src.services.aggregation_service import aggregate_volume_by_quarter, aggregate_volume_by_year_and_classification 

aggregation_bp = Blueprint('aggregation', __name__)

@aggregation_bp.route('/yearly-trend', methods=['POST'])
def yearly_trend():
     data = request.get_json()

     filters = data.get('filters', {})
     start_year = data.get('start_year')
     end_year = data.get('end_year')
     n_quarters = data.get('n_quarters', 4)
     w_rf = float(data.get('w_rf', 0.3))
     w_gb = float(data.get('w_gb', 0.7))
    
     df_features = DataContext.features()

     # Historical + Predicted Data
     df = get_yearwise_trend(
        df_features=df_features,
        filters=filters,
        n_quarters=n_quarters,
         w_rf=w_rf,
         w_gb=w_gb
     )

     if start_year:
         df = df[df['year'] >= start_year]

     result = aggregate_volume_by_year_and_classification(df)

     return jsonify(result.to_dict(orient='records'))

@aggregation_bp.route('/quarterly-prediction', methods=['POST'])
def quarterly_prediction():
     data = request.get_json()

     filters = data.get('filters', {})
     start_year = data.get('start_year')
     end_year = data.get('end_year')
     n_quarters = data.get('n_quarters', 4)
     w_rf = float(data.get('w_rf', 0.3))
     w_gb = float(data.get('w_gb', 0.7))
    
     df_features = DataContext.features()

     # Historical + Predicted Data
     df = get_quarterly_prediction(
        df_features=df_features,
        filters=filters,
        n_quarters=n_quarters,
        w_rf=w_rf,
        w_gb=w_gb
     )

     result = aggregate_volume_by_quarter(df)

     return jsonify(result.to_dict(orient='records'))

@aggregation_bp.route('/aggregate', methods=['POST'])
def aggregate_dynamic():
    payload = request.get_json()

    filters   = payload.get("filters", {})
    group_by  = payload.get("group_by", [])
    drill_by  = payload.get("drill_by", [])
    metrics   = payload.get("metrics", ["mishap_count"])
    n_quarters = payload.get("n_quarters", 8)
    w_rf = float(payload.get('w_rf', 0.3))
    w_gb = float(payload.get('w_gb', 0.7))

    df_features = DataContext.features()

    result_df = get_dynamic_aggregation(
         df_features=df_features,
         filters=filters,
         n_quarters=n_quarters,
         group_by=group_by,
         drill_by=drill_by,
         metrics=metrics,
         w_rf=w_rf,
         w_gb=w_gb
      )

    return jsonify(result_df.to_dict(orient="records"))
