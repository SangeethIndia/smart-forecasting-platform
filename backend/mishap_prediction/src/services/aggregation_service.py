import pandas as pd

def aggregate_volume_by_year(df: pd.DataFrame) -> pd.DataFrame:
     """
     Aggregates mishap volume by year.
     Works for both historical and predicted data.
     """

     required_columns = {'year', 'entity_type', 'entity_value', 'mishap_count', 'data_type'}

     if not required_columns.issubset(df.columns):
          raise ValueError(f"Input DataFrame must contain the following columns: {required_columns}")
     
     agg_df = (
          df.groupby(
                ['year', 'entity_type', 'entity_value', 'data_type'], as_index=False
               )
           ['mishap_count'].sum().sort_values(by=['year', 'entity_type', 'entity_value'])
     )

     return agg_df

def aggregate_volume_by_quarter(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregates mishap volume by quarter (seasonality view).
    """

    required_columns = {'quarter', 'entity_type', 'entity_value', 'mishap_count', 'data_type'}

    if not required_columns.issubset(df.columns):
        raise ValueError("Missing required columns for quarter aggregation")

    agg_df = (
        df
        .groupby(
            ['year', 'quarter', 'entity_type', 'entity_value', 'data_type'],
            as_index=False
        )["mishap_count"]
        .sum()
        .sort_values(by=['year', 'quarter', 'entity_type', 'entity_value'])
    )

    return agg_df

def aggregate_volume_by_year_and_classification(df):
     """
     Year wise Mishap volume grouped by classification. 
     Works for actual + predicted data. 
     """

     agg_df = (
          df.groupby(
               ['entity_type', 'entity_value', 'year', 'data_type'],
               as_index=False
          )['mishap_count']
          .sum()
          .sort_values(by=['entity_type', 'entity_value', 'year', 'data_type'])
     )

     return agg_df

def get_insight_text(df):
     """
     Generates insight text based on the aggregated data.
     For example, identifies top increasing classifications or seasonal trends.
     """
     # Placeholder for actual insight generation logic
     df = df.sort_values("year")

     start_year = df.iloc[0]["year"]
     end_year = df.iloc[-1]["year"]

     start_val = df.iloc[0]["mishap_count"]
     end_val = df.iloc[-1]["mishap_count"]

     peak_row = df.loc[df["mishap_count"].idxmax()]
     peak_year = peak_row["year"]

     if end_val > start_val * 1.5:
          trend = "rose sharply"
     elif end_val > start_val:
          trend = "increased"
     elif end_val < start_val * 0.7:
          trend = "declined significantly"
     elif end_val < start_val:
          trend = "declined"
     else:
          trend = "remained stable"

     entity = df.iloc[0]["entity_value"]

     insight_text = (
          f"{entity} mishaps {trend} between {start_year} and {end_year}, "
          f"peaking in {peak_year}."
     )

     return insight_text


