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
