export interface EntityFilter {
  entity_type: string
  entity_value: string[]
}

// The request shape accepted by the backend and used by the UI.
// Use a keyed filters object so the JSON payload looks like:
// { "filters": { "MishapType": ["Aviation","Ground"], "Source": ["Mishap Report"] }, "n_quarters": 8 }
export interface MishapPredictionRequest {
  filters: { [key: string]: string[] }
  n_quarters: number
  // optional range override - backend may accept these to limit the time window
  start_year?: number
  end_year?: number
}
