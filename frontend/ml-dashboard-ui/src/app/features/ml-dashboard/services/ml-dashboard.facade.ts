import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { MishapPredictionResponse } from "../../../shared/models/ml-response.model";
import { MlService } from "../../../services/ml.service";
import { MishapPredictionRequest } from "../../../shared/models/ml-request.model";

@Injectable()
export class MlDashboardFacade {

  loading$ = new BehaviorSubject<boolean>(false);
  result$ = new BehaviorSubject<MishapPredictionResponse | null>(null);

  constructor(private mlService: MlService) {}

  runPrediction(payload: MishapPredictionRequest, isQuarterlyPrediction = false) {
    this.loading$.next(true);

    if (isQuarterlyPrediction) {
      this.mlService.predictQuarterlyData(payload).subscribe({
        next: (res: any) => {
            // Backend may return several shapes. Normalize into the wrapped
            // form { predictions: YearlyTrend[], summary_insight?: string }
            // so templates can always use `result.predictions` and optionally
            // show `result.summary_insight` when present.
            // Helper: normalize an array of rows into { predictions: [...] }
              const normalizePredictionArray = (arr: any[]) => {
              // Keep only primary classification rows to avoid Source rows
              // leaking into classification totals. Aggregate by year+quarter
              // (when present), entity_value and data_type so multiple rows
              // per bucket (e.g., per-source rows) are summed.
              const agg = new Map<string, { year: number; quarter?: number | null; entity_value: string; data_type: string; mishap_count: number }>();
              arr.forEach(r => {
                const entityType = r?.entity_type ?? r?.EntityType ?? '';
                const year = Number(r?.year ?? r?.Year) || 0;
                const quarterRaw = r?.quarter ?? r?.q ?? null;
                const quarter = quarterRaw == null ? null : Number(quarterRaw);
                const entity = r?.entity_value ?? r?.MishapClassification ?? r?.mishapclassification ?? 'Unknown';
                const dtype = r?.data_type ?? r?.DataType ?? 'actual';
                const raw = r?.mishap_count ?? r?.mishapCount ?? r?.count ?? 0;
                const count = Number(String(raw).replace(/,/g, '')) || 0;
                // include quarter and entityType in key to avoid mixing identically named values
                const key = `${year}::${quarter ?? 'n'}::${entityType}::${entity}::${dtype}`;
                if (!agg.has(key)) agg.set(key, { year, quarter, entity_value: entity, data_type: dtype, mishap_count: count });
                else agg.get(key)!.mishap_count += count;
              });
              return Array.from(agg.entries()).map(([k, v]) => ({
                year: v.year,
                quarter: v.quarter == null ? undefined : v.quarter,
                mishap_count: v.mishap_count,
                entity_type: (k.split('::')[2] || 'Unknown'),
                entity_value: v.entity_value,
                data_type: v.data_type
              }));
            };

            if (Array.isArray(res)) {
              this.result$.next({ predictions: normalizePredictionArray(res) });
            } else if (res && Array.isArray(res.predictions)) {
              this.result$.next(res as MishapPredictionResponse);
            } else if (res && Array.isArray(res.data)) {
              // New shape: { data: [...], summary_insight?: string }
              this.result$.next({ predictions: normalizePredictionArray(res.data), summary_insight: res.summary_insight });
            } else {
              // unexpected shape; still forward as-is to make debugging easier
              this.result$.next(res as any);
            }
        },
        error: err => console.error('ML Error', err),
        complete: () => this.loading$.next(false)
      });
    }
    else {
      this.mlService.predict(payload).subscribe({
        next: (res: any) => {
            // Normalize shapes: array | { predictions: [] } | { data: [], summary_insight }
            const normalizePredictionArray = (arr: any[]) => {
                    // Aggregate by year+quarter (when present), entity_value and data_type.
                    const agg = new Map<string, { year: number; quarter?: number | null; entity_value: string; data_type: string; mishap_count: number }>();
                    arr.forEach(r => {
                      const entityType = r?.entity_type ?? r?.EntityType ?? '';
                      const year = Number(r?.year ?? r?.Year) || 0;
                      const quarterRaw = r?.quarter ?? r?.q ?? null;
                      const quarter = quarterRaw == null ? null : Number(quarterRaw);
                      const entity = r?.entity_value ?? r?.MishapClassification ?? r?.mishapclassification ?? 'Unknown';
                      const dtype = r?.data_type ?? r?.DataType ?? 'actual';
                      const raw = r?.mishap_count ?? r?.mishapCount ?? r?.count ?? 0;
                      const count = Number(String(raw).replace(/,/g, '')) || 0;
                      // include quarter and entityType in key to avoid mixing identically named values
                      const key = `${year}::${quarter ?? 'n'}::${entityType}::${entity}::${dtype}`;
                      if (!agg.has(key)) agg.set(key, { year, quarter, entity_value: entity, data_type: dtype, mishap_count: count });
                      else agg.get(key)!.mishap_count += count;
                    });
                    return Array.from(agg.entries()).map(([k, v]) => ({
                      year: v.year,
                      quarter: v.quarter == null ? undefined : v.quarter,
                      mishap_count: v.mishap_count,
                      entity_type: (k.split('::')[2] || 'Unknown'),
                      entity_value: v.entity_value,
                      data_type: v.data_type
                    }));
                  };

            if (Array.isArray(res)) {
              this.result$.next({ predictions: normalizePredictionArray(res) });
            } else if (res && Array.isArray(res.predictions)) {
              this.result$.next(res as MishapPredictionResponse);
            } else if (res && Array.isArray(res.data)) {
              this.result$.next({ predictions: normalizePredictionArray(res.data), summary_insight: res.summary_insight });
            } else {
              this.result$.next(res as any);
            }
        },
        error: err => console.error('ML Error', err),
        complete: () => this.loading$.next(false)
      });
    }
  }

  runAggregate(payload: any) {
    // Clear current result immediately to hide the old chart while we load
    // the drill data. The UI reserves the chart space while loading to
    // avoid layout shifts.
    try { this.result$.next(null); } catch (e) {}
    this.loading$.next(true);
    this.mlService.aggregate(payload).subscribe({
      next: (res: any) => {
        // Backend returns flat rows. Transform into the { predictions: [] }
        // shape expected by the chart where each row contains `entity_value`,
        // `year` and `mishap_count`.
        if (Array.isArray(res)) {
          // Backend may return multiple rows per (year, classification) - for
          // example a row per source or bucket. Aggregate these server rows
          // into a single value per (year, entity_value) by summing
          // `mishap_count` to avoid inflated duplicate values in the chart.
          const aggMap = new Map<string, { year: number; entity_value: string; mishap_count: number }>();
          res.forEach((r: any) => {
            // Prefer explicit classification fields. If not present, skip
            // rows such as 'Source' entries which don't represent a class.
            const cls = r?.MishapClassification ?? r?.mishapclassification ?? r?.MishapClass ?? r?.mishap_classification ?? r?.classification;
            // If there's no classification, skip this row (e.g. Source rows).
            if (cls == null || cls === '') return;
            const year = (r?.year ?? r?.Year) as number;
            // defensive parse: allow numeric strings with commas
            const raw = r?.mishap_count ?? r?.mishapCount ?? r?.count ?? 0;
            const count = Number(String(raw).replace(/,/g, '')) || 0;
            const key = `${year}::${cls}`;
            if (!aggMap.has(key)) {
              aggMap.set(key, { year, entity_value: cls, mishap_count: count });
            } else {
              const cur = aggMap.get(key)!;
              cur.mishap_count = (cur.mishap_count || 0) + count;
              aggMap.set(key, cur);
            }
          });
          const mapped = Array.from(aggMap.values()).map(v => ({
            year: v.year,
            mishap_count: v.mishap_count,
            entity_type: 'MishapClassification',
            entity_value: v.entity_value,
            data_type: 'actual'
          }));
          console.debug('[ml-dashboard.facade] aggregate mapped', mapped);
          this.result$.next({ predictions: mapped });
        } else if (res && Array.isArray(res.predictions)) {
          // already wrapped - but ensure items provide entity_value and year
          const mapped = (res.predictions as any[]).map((r: any) => ({
            year: r?.year ?? r?.Year,
            mishap_count: Number(r?.mishap_count ?? r?.mishapCount ?? r?.count ?? 0),
            entity_type: r?.entity_type ?? 'MishapClassification',
            entity_value: r?.MishapClassification ?? r?.mishapclassification ?? r?.entity_value ?? 'Unknown',
            data_type: r?.data_type ?? 'actual'
          }));
          this.result$.next({ predictions: mapped });
        } else {
          this.result$.next(res as any);
        }
      },
      error: err => {
        console.error('Aggregate Error', err);
        this.loading$.next(false);
      },
      complete: () => this.loading$.next(false)
    });
  }
}
