from typing import List, Dict
from src.backtesting.config import BacktestConfig
from src.backtesting.splitter import walk_forward_splits

def run_backtest(
          df,
          model_factory,
          config: BacktestConfig,
          model_version: str
) -> List[Dict]:
     results = []

     for entity_id, entity_df in df.groupby(config.entity_col):
          entity_df = entity_df.sort_values(config.time_col)

          for train_periods, forecast_periods in walk_forward_splits(entity_df, config):
               train_df = entity_df[entity_df[config.time_col].isin(train_periods)]
               test_df = entity_df[entity_df[config.time_col].isin(forecast_periods)]

               model = model_factory()
               model.fit(train_df)

               preds = model.predict(
                    horizon=len(forecast_periods),
                    last_known_df=train_df
               )

               for period, actual, pred in zip(
                    test_df[config.time_col],
                    test_df[config.target_col],
                    preds
               ):
                    results.append({
                    "entity_id": entity_id,
                    "train_end_period": train_periods[-1],
                    "forecast_period": period,
                    "actual_value": actual,
                    "predicted_value": pred,
                    "error": actual - pred,
                    "abs_error": abs(actual - pred),
                    "model_version": model_version
                })