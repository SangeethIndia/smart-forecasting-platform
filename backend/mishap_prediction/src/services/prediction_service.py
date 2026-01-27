import pandas as pd

from src.models.predict import predict_future_quarters
from src.services.combine_actual_predicted import combine_actual_predicted
from src.services.aggregation_service import aggregate_volume_by_year
from src.utils.helpers import apply_entity_filters

def get_yearwise_trend(df_features, filters, n_quarters):
     actual_df = apply_entity_filters(df_features, filters)[['year', 'quarter', 'entity_type', 'entity_value', 'mishap_count']]
     combined_df = pd.DataFrame()
     
     for etype, values in filters.items():
          for val in values:
               predicted_df = predict_future_quarters(
                    df_features=df_features,
                    entity_type=etype,
                    entity_value=val,
                    n_quarters=n_quarters)
               
               combined_df = pd.concat(
                                   [combined_df, combine_actual_predicted(actual_df, predicted_df)],ignore_index=True
                              )


     yearly_trend = aggregate_volume_by_year(combined_df)

     return yearly_trend