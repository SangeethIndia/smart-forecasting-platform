import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { MlResponse } from "../../../shared/models/ml-response.model";
import { MlService } from "../../../services/ml.service";
import { MlRequest } from "../../../shared/models/ml-request.model";

@Injectable()
export class MlDashboardFacade {

  loading$ = new BehaviorSubject<boolean>(false);
  result$ = new BehaviorSubject<MlResponse | null>(null);

  constructor(private mlService: MlService) {}

  runPrediction(payload: MlRequest) {
    this.loading$.next(true);

    this.mlService.predict(payload).subscribe({
      next: res => this.result$.next(res),
      error: err => console.error('ML Error', err),
      complete: () => this.loading$.next(false)
    });
  }
}
