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
          // Backend may return either an array of YearlyTrend items or a
          // wrapped object { predictions: YearlyTrend[] }. Normalize to the
          // wrapped form so templates can always use `result.predictions`.
          if (Array.isArray(res)) {
            this.result$.next({ predictions: res });
          } else if (res && Array.isArray(res.predictions)) {
            this.result$.next(res as MishapPredictionResponse);
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
          // Backend may return either an array of YearlyTrend items or a
          // wrapped object { predictions: YearlyTrend[] }. Normalize to the
          // wrapped form so templates can always use `result.predictions`.
          if (Array.isArray(res)) {
            this.result$.next({ predictions: res });
          } else if (res && Array.isArray(res.predictions)) {
            this.result$.next(res as MishapPredictionResponse);
          } else {
            // unexpected shape; still forward as-is to make debugging easier
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
          const mapped = res.map((r: any) => {
            // Support multiple possible casing for the classification field
            const cls = r?.MishapClassification ?? r?.mishapclassification ?? r?.MishapClass ?? r?.mishap_classification ?? r?.classification ?? 'Unknown';
            return {
              year: (r?.year ?? r?.Year) as number,
              mishap_count: Number(r?.mishap_count ?? r?.mishapCount ?? r?.count ?? 0),
              entity_type: 'MishapClassification',
              entity_value: cls,
              data_type: 'actual'
            };
          });
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
