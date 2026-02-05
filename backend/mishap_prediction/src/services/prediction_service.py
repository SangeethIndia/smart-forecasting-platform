import pandas as pd

from src.models.predict import predict_future_quarters
from src.services.combine_actual_predicted import combine_actual_predicted
from src.services.aggregation_service import aggregate_volume_by_quarter, aggregate_volume_by_year
from src.utils.helpers import aggregate_data, aggregate_dynamic, apply_entity_column_filters, apply_entity_filters, apply_filters, build_group_cols, reshape_entities

def get_yearwise_trend(df_features, filters, n_quarters, w_rf, w_gb):
     actual_df = apply_entity_filters(df_features, filters)[['year', 'quarter', 'entity_type', 'entity_value', 'mishap_count']]
     combined_df = pd.DataFrame()

     for etype, values in filters.items():
          for val in values:
               predicted_df = predict_future_quarters(
                    df_features=df_features,
                    entity_type=etype,
                    entity_value=val,
                    n_quarters=n_quarters,
                    w_rf=w_rf,
                    w_gb=w_gb)
               
               combined_df = pd.concat(
                                   [combined_df, combine_actual_predicted(actual_df, predicted_df)],ignore_index=True
                              )


     yearly_trend = aggregate_volume_by_year(combined_df)

     return yearly_trend

def get_quarterly_prediction(df_features, filters, n_quarters, w_rf, w_gb):
     actual_df = apply_entity_filters(df_features, filters)[['year', 'quarter', 'entity_type', 'entity_value', 'mishap_count']]
     combined_df = pd.DataFrame()
     
     for etype, values in filters.items():
          for val in values:
               predicted_df = predict_future_quarters(
                    df_features=df_features,
                    entity_type=etype,
                    entity_value=val,
                    n_quarters=n_quarters,
                    w_rf=w_rf, 
                    w_gb=w_gb)
               
               combined_df = pd.concat(
                                   [combined_df, combine_actual_predicted(actual_df, predicted_df)],ignore_index=True
                              )
               
     quarterly_trend = aggregate_volume_by_quarter(combined_df)

     return quarterly_trend

def get_classification_distribution(df_features):
    cls_df = df_features[
        df_features["entity_type"] == "MishapClassification"
    ]

    dist = (
        cls_df
        .groupby(["entity_value"])["mishap_count"]
        .sum()
        .reset_index()
    )

    dist["ratio"] = dist["mishap_count"] / dist["mishap_count"].sum()
    return dist[["entity_value", "ratio"]]

def explode_by_classification(predicted_df, cls_dist):
    expanded = []

    for _, row in predicted_df.iterrows():
        for _, cls in cls_dist.iterrows():
            expanded.append({
                "year": row["year"],
                "quarter": row["quarter"],
                "entity_type": "MishapClassification",
                "entity_value": cls["entity_value"],
                "mishap_count": round(row["mishap_count"] * cls["ratio"]),
                "data_type": "predicted"
            })

    return pd.DataFrame(expanded)

def get_dynamic_aggregation(
    df_features,
    filters,
    group_by,
    drill_by,
    metrics,
    n_quarters=8,
    w_rf=0.3,
    w_gb=0.7
):
    raw_df = df_features.copy()
    combined_df = pd.DataFrame()

    # 1. Predict per filtered entity
    for f in filters:
        etype = f["entity_type"]
        values = f["entity_value"]

        for val in values:
            actual_df = raw_df[
                (raw_df["entity_type"] == etype) &
                (raw_df["entity_value"] == val)
            ][["year", "quarter", "entity_type", "entity_value", "mishap_count"]]

            predicted_df = predict_future_quarters(
                df_features=raw_df,
                entity_type=etype,
                entity_value=val,
                n_quarters=n_quarters,
                w_rf=w_rf,
                w_gb=w_gb
            )

            combined_df = pd.concat(
                [
                    combined_df,
                    combine_actual_predicted(actual_df, predicted_df)
                ],
                ignore_index=True
            )

    # 2. Drill down predicted values into MishapClassification
    cls_dist = get_classification_distribution(raw_df)

    predicted_only = combined_df[
        combined_df["data_type"] == "predicted"
    ]

    cls_pred_df = explode_by_classification(predicted_only, cls_dist)

    combined_df = pd.concat(
        [combined_df, cls_pred_df],
        ignore_index=True
    )

    # 3. Reshape AFTER drill-down exists
    pivot_df = reshape_entities(combined_df)

    # 4. Aggregate
    aggregated_df = aggregate_dynamic(
        df=pivot_df,
        group_by=group_by,
        drill_by=drill_by,
        metrics=metrics
    )

    # 5. Final filters
    final_df = apply_entity_column_filters(aggregated_df, filters)

    return final_df
