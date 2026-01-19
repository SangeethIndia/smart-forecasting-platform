import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MlFormComponent } from "../components/ml-form/ml-form.component";
import { MlChartComponent } from "../components/ml-chart/ml-chart.component";
import { MlTableComponent } from "../components/ml-table/ml-table.component";
import { MlDashboardFacade } from "../services/ml-dashboard.facade";
import { MlRequest } from "../../../shared/models/ml-request.model";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: 'app-ml-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MlFormComponent,
    MlChartComponent,
    MlTableComponent
  ],
  providers: [MlDashboardFacade, HttpClient],
  styleUrls: ['./ml-dashboard.component.scss'],
  templateUrl: './ml-dashboard.component.html'
})
export class MlDashboardPage {
  // viewMode controls whether Chart or Table is shown. 'chart' | 'table'
  viewMode: 'chart' | 'table' = 'chart';
  constructor(public facade: MlDashboardFacade) {}

  onSubmit(payload: MlRequest) {
    this.facade.runPrediction(payload);
  }
}
