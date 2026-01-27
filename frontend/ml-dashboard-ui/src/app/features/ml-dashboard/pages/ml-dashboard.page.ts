import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MlChartComponent } from "../components/ml-chart/ml-chart.component";
// MlFormComponent intentionally removed (top panel) per UI change
import { MlDashboardFacade } from "../services/ml-dashboard.facade";
import { MishapPredictionRequest } from "../../../shared/models/ml-request.model";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: 'app-ml-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MlChartComponent
],
  providers: [MlDashboardFacade, HttpClient],
  styleUrls: ['./ml-dashboard.component.scss'],
  templateUrl: './ml-dashboard.component.html'
})
export class MlDashboardPage {
  // UI-driven selections
  // 'year' | 'quarter' | 'classification'
  trendMode: 'year' | 'quarter' | 'classification' = 'year';
  // default quarters to request when quarterly/seasonal view is chosen
  n_quarters = 8;

  constructor(public facade: MlDashboardFacade) {}

  // Keep existing form hook for compatibility with the embedded form component
  onSubmit(payload: MishapPredictionRequest) {
    this.facade.runPrediction(payload);
  }

  // Build MishapPredictionRequest with keyed filters object and invoke facade
  // Group only by Aviation and Ground and always use Source = Mishap Report
  applyFilters() {
    let payload: MishapPredictionRequest = {
      filters: {},
      n_quarters: 0
    };

    if (this.trendMode == 'year') {
      payload = {
        filters: {
          MishapType: ['Aviation', 'Ground'],
          Source: ['Mishap Report']
        },
        n_quarters: this.n_quarters,
        start_year: 2018,
        end_year: 2025
      };
    }
    else if (this.trendMode == 'quarter') {
      payload = {
        filters: {
          MishapType: ['Aviation', 'Ground'],
          Source: ['Mishap Report']
        },
        n_quarters: 4,
        start_year: 2026,
        end_year: 2027
      };
    }
    else if (this.trendMode == 'classification') {
      payload = {
        filters: {
          MishapClassification: ['A', 'B', 'C', 'D', 'E'],
          Source: ['Mishap Report']
        },
        n_quarters: this.n_quarters,
        start_year: 2018,
        end_year: 2025
      };
    }

    this.facade.runPrediction(payload, this.trendMode == 'quarter');
  }
}
