from flask import Blueprint, request, jsonify
from src.config import PROCESSED_DATA_DIR
from data.data_context import DataContext
from src.services.prediction_service import get_yearwise_trend
from src.services.aggregation_service import aggregate_volume_by_year_and_classification 
import pandas as pd

aggregation_bp = Blueprint('aggregation', __name__)

@aggregation_bp.route('/yearly-trend', methods=['POST'])
def yearly_trend():
     data = request.get_json()

     filters = data.get('filters', {})
     start_year = data.get('start_year')
     end_year = data.get('end_year')
     n_quarters = data.get('n_quarters', 4)
    
     df_features = DataContext.features()

     # Historical + Predicted Data
     df = get_yearwise_trend(
        df_features=df_features,
        filters=filters,
        n_quarters=n_quarters
     )

     if start_year:
         df = df[df['year'] >= start_year]

     result = aggregate_volume_by_year_and_classification(df)

     return jsonify(result.to_dict(orient='records'))