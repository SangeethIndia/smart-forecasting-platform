from typing import List, Tuple, Iterator
from src.backtesting.config import BacktestConfig

def walk_forward_splits(
          df,
          config: BacktestConfig
) -> Iterator[Tuple[List, List]]:
     
     periods = sorted(df[config.time_col].unique())

     for i in range(
          config.min_train_periods,
          len(periods) - config.forecast_horizon + 1
     ):
          train_periods = periods[:i]
          forecast_periods = periods[i: i + config.forecast_horizon]

          yield train_periods, forecast_periods

