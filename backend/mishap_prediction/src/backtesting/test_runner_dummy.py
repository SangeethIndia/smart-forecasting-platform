import pandas as pd

from src.backtesting.config import BacktestConfig
from src.backtesting.runner import run_backtest

data = {
    "entity_id": ["A"] * 8,
    "period": [
        "2021-Q1", "2021-Q2", "2021-Q3", "2021-Q4",
        "2022-Q1", "2022-Q2", "2022-Q3", "2022-Q4"
    ],
    "mishap_count": [5, 6, 4, 7, 6, 8, 7, 9]
}

df = pd.DataFrame(data)

class DummyModel:
     def fit(self, train_df):
          # store last known value
          self.last_value = train_df["mishap_count"].iloc[-1]

     def predict(self, horizon, last_known_df):
          # predict last known value repeatedly
          return [self.last_value] * horizon
     
def dummy_model_factory():
     return DummyModel()

config = BacktestConfig(
    time_col="period",
    target_col="mishap_count",
    entity_col="entity_id",
    min_train_periods=4,
    forecast_horizon=1
)

results = run_backtest(
    df,
    model_factory=dummy_model_factory,
    config=config,
    model_version="dummy_v1"
)

results_df = pd.DataFrame(results)
print(results_df)
