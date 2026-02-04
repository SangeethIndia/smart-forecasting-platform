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
  // mode currently displayed in the chart. Only updated when user clicks Apply
  chartModeActive: 'year' | 'quarter' | 'classification' = 'year';
  // default quarters to request when quarterly/seasonal view is chosen
  n_quarters = 8;

  constructor(public facade: MlDashboardFacade) {}

  // breadcrumb stack for drill navigation. Each entry stores the label shown
  // and a snapshot of the previous result so Back can restore it.
  breadcrumbs: Array<{ label: string; previousMode: string; previousResult: any }> = [];

  onDrill(evt: { entity: string; year?: number; quarter?: number; label?: string }) {
    if (!evt || !evt.entity) return;

    // snapshot current result so we can go back
    const current = this.facade.result$.getValue();
    this.breadcrumbs.push({ label: `${evt.entity}${evt.year ? ' - ' + evt.year : ''}`, previousMode: this.chartModeActive, previousResult: current });

    // build aggregate payload matching backend examples
    const filters: any[] = [
      { entity_type: 'MishapType', entity_value: [evt.entity] },
      { entity_type: 'Source', entity_value: ['Mishap Report'] }
    ];

    const payload: any = {
      filters,
      group_by: ['year', 'mishapclassification'],
      metrics: ['mishap_count']
    };

    if (evt.year) {
      payload.start_year = evt.year;
      payload.end_year = evt.year;
    }

    // set chart into classification mode and request aggregated data
    this.chartModeActive = 'classification';
    this.facade.runAggregate(payload);
  }

  onBack() {
    if (!this.breadcrumbs.length) return;
    const last = this.breadcrumbs.pop();
    if (last) {
      this.chartModeActive = (last.previousMode as any) || 'year';
      // restore the previous result snapshot if available
      try {
        this.facade.result$.next(last.previousResult);
      } catch (e) {
        // if restoring fails, clear the view
        this.facade.result$.next(null);
      }
    }
  }

  // Keep existing form hook for compatibility with the embedded form component
  onSubmit(payload: MishapPredictionRequest) {
    this.facade.runPrediction(payload);
  }

  // Build MishapPredictionRequest with keyed filters object and invoke facade
  // Group only by Aviation and Ground and always use Source = Mishap Report
  applyFilters() {
    // set displayed mode only when user clicks Apply
    this.chartModeActive = this.trendMode;
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

  onTrendModeChange() {
    // Clear current result so the chart area hides until user clicks Apply
    try {
      this.facade.result$.next(null);
    } catch (e) {}
  }
}
