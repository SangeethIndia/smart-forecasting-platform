import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { MlRequest } from '../shared/models/ml-request.model';
import { MlResponse } from '../shared/models/ml-response.model';

@Injectable({ providedIn: 'root' })
export class MlService {

  constructor(private http: HttpClient) {}

  predict(payload: MlRequest) {
    return this.http.post<MlResponse>(
      `${environment.apiBaseUrl}/predict`,
      payload
    );
  }
}
