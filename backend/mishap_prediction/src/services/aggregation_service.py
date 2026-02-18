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

def get_insight_text(df, report_type='mishap_by_type'):
    df = df[df["data_type"] == "actual"]

    if report_type == 'mishap_by_type':
        df = df[df["entity_value"].isin(["Aviation", "Ground"])]

        summary = {}

        for entity in df["entity_value"].unique():

            entity_df = df[df["entity_value"] == entity].sort_values("year")

            if entity_df.empty:
                continue

            peak_row = entity_df.loc[entity_df["mishap_count"].idxmax()]
            peak_year = peak_row["year"]
            peak_value = peak_row["mishap_count"]

            post_peak_df = entity_df[entity_df["year"] > peak_year]

            if not post_peak_df.empty:
                last_val = post_peak_df.iloc[-1]["mishap_count"]
                change_pct = ((last_val - peak_value) / peak_value) * 100
            else:
                change_pct = 0

            summary[entity] = {
                "peak_year": peak_year,
                "peak_value": peak_value,
                "post_change_pct": change_pct
            }

        # If both exist, generate comparative insight
        if "Aviation" in summary and "Ground" in summary:

            av = summary["Aviation"]
            gr = summary["Ground"]

            if av["peak_year"] == gr["peak_year"]:
                base_text = (
                    f"Both Aviation and Ground mishaps peaked in {av['peak_year']}, "
                    f"marking a significant spike in incident activity."
                )
            else:
                base_text = (
                    f"Aviation peaked in {av['peak_year']}, "
                    f"while Ground peaked in {gr['peak_year']}."
                )

            # Compare post-peak decline
            if abs(av["post_change_pct"]) > abs(gr["post_change_pct"]):
                trend_text = "Aviation showed a sharper post-peak correction compared to Ground."
            elif abs(av["post_change_pct"]) < abs(gr["post_change_pct"]):
                trend_text = "Ground showed a sharper post-peak correction compared to Aviation."
            else:
                trend_text = "Both categories followed similar post-peak trajectories."

            return f"{base_text} {trend_text}"

    # fallback (your existing per-entity logic if needed)
    return "Trend analysis completed."


from collections import defaultdict

import pandas as pd
from collections import defaultdict

def get_classification_insight(df: pd.DataFrame) -> str:
    """
    Generates classification-based insight text.
    High severity: A, B, C
    Others treated as lower severity.
    """

    if df.empty:
        return "No data available for classification insight."
    
    df = df[df["entity_value"].isin(['A', 'B', 'C', 'D', 'E'])]

    high_severity = {"A", "B", "C"}

    # Ensure proper sorting
    df = df.sort_values(["entity_value", "year"])

    # Find peak year for each classification
    peak_info = (
        df.loc[df.groupby("entity_value")["mishap_count"].idxmax()]
        [["entity_value", "year"]]
    )

    # Group classifications by peak year
    grouped = defaultdict(list)
    for _, row in peak_info.iterrows():
        grouped[row["year"]].append(row["entity_value"])

    years = sorted(grouped.keys())
    sentences = []

    for idx, year in enumerate(years):

        classifications = grouped[year]

        high = sorted([c for c in classifications if c in high_severity])
        others = sorted([c for c in classifications if c not in high_severity])

        parts = []

        if high:
            parts.append(f"High-severity mishaps ({', '.join(high)})")

        if others:
            parts.append(f"Other classifications ({', '.join(others)})")

        combined_text = " and ".join(parts)

        if idx == 0:
            sentence = (
                f"{combined_text} peaked in {year}, "
                f"marking a significant surge in incident activity."
            )
        else:
            sentence = (
                f"{combined_text} peaked later in {year}, "
                f"indicating continued structural shifts in incident patterns."
            )

        sentences.append(sentence)

    return " ".join(sentences)