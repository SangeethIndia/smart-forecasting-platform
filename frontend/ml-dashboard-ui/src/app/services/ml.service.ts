import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { MishapPredictionRequest } from '../shared/models/ml-request.model';
import { MishapPredictionResponse } from '../shared/models/ml-response.model';

@Injectable({ providedIn: 'root' })
export class MlService {

  constructor(private http: HttpClient) {}

  predict(payload: MishapPredictionRequest) {
    return this.http.post<MishapPredictionResponse>(
      `${environment.apiBaseUrl}/api/mishaps/yearly-trend`,
      payload
    );
  }
}
