import pandas as pd

def combine_actual_predicted(
     actual_df: pd.DataFrame,
     predicted_df: pd.DataFrame
) -> pd.DataFrame:
     actual = actual_df.copy()
     actual['data_type'] = 'actual'

     predicted = predicted_df.copy()
     predicted['data_type'] = 'predicted'

     combined = pd.concat([actual, predicted], ignore_index=True)

     combined = combined.sort_values(by=['year', 'quarter', 'entity_type', 'entity_value'])

     return combined