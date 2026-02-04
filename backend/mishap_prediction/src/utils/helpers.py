import pandas as pd


def normalize_to_list(value):
    if value is None:
        return None
    if isinstance(value, list):
        return value
    return [v.strip() for v in value.split(",") if v.strip()]


def apply_entity_filters(df, filters: dict):
    mask = False

    for entity_type, values in filters.items():
        mask |= (
            (df['entity_type'] == entity_type) &
            (df['entity_value'].isin(values))
        )

    return df[mask]

def apply_filters(df: pd.DataFrame, filters: list):
    mask = False

    for f in filters:
        mask |= (
            (df['entity_type'] == f['entity_type']) &
            (df['entity_value'].isin(f['entity_value']))
        )

    return df[mask]

def apply_entity_column_filters(df, filters):
    for f in filters:
        etype = f["entity_type"]
        values = f["entity_value"]

        if etype in df.columns:
            df = df[df[etype].isin(values)]

    return df



def build_group_cols(group_by, drill_by):
    return group_by + drill_by

agg_map = {
    'mishap_count': 'sum'
    }

def aggregate_data(df, group_cols, metrics):
    agg_map = {metric: 'sum' for metric in metrics}

    return (
                df.groupby(group_cols, asIndex=False)
                    .agg(agg_map)
                    .sort_values(group_cols)
        )

def resolve_columns(cols, col_map):
    resolved = []

    for c in cols:
        key = c.lower()
        if key not in col_map:
            raise ValueError(f"Invalid column name: {c}")
        resolved.append(col_map[key])
        
    return resolved


def aggregate_dynamic(df, group_by, drill_by, metrics):
    col_map = {c.lower(): c for c in df.columns}
    
    group_by_resolved  = resolve_columns(group_by, col_map)
    drill_by_resolved  = resolve_columns(drill_by, col_map)
    metric_resolved    = resolve_columns(metrics, col_map)

    group_cols = group_by_resolved + drill_by_resolved

    agg_dict = {}
    for metric in metric_resolved:
        if metric == "mishap_count":
            agg_dict[metric] = "sum"

    result = (
        df
            .groupby(group_cols, as_index=False)
            .agg(agg_dict)
            .sort_values(group_cols)
    )

    return result

def reshape_entities(df):
    return (
        df
        .pivot_table(
            index=["year", "quarter", "mishap_count"],
            columns="entity_type",
            values="entity_value",
            aggfunc="first"
        )
        .reset_index()
    )

