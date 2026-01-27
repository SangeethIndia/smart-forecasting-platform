export interface YearlyTrend {
  year: number;
  mishap_count: number;
  entity_type: string;
  entity_value: string;
  data_type: string;
}

export interface MishapPredictionResponse {
  predictions: YearlyTrend[];
  feature_importance?: any;
}
