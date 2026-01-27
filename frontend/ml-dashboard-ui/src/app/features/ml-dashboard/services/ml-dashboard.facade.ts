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

  runPrediction(payload: MishapPredictionRequest) {
    this.loading$.next(true);

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
