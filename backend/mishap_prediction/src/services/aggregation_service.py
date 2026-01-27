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
            ['quarter', 'entity_type', 'entity_value', 'data_type'],
            as_index=False
        )["mishap_count"]
        .sum()
        .sort_values(by=['quarter', 'entity_type', 'entity_value'])
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

