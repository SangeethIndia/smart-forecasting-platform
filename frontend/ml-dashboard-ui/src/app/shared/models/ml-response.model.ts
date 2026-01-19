export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface Prediction {
  quarter: string;
  predicted_count: number;
}

export interface MlResponse {
  predictions: Prediction[];
  feature_importance: FeatureImportance[];
}
