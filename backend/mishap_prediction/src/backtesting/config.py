from dataclasses import dataclass

@dataclass
class BacktestConfig:
    time_col: str = "period"
    target_col: str = "mishap_count"
    entity_col: str = "entity_id"
    min_train_periods: int = 8
    forecast_horizon: int = 1
    retrain_each_step: bool = True
