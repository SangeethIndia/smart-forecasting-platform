import { NgModule } from "@angular/core";
import { MlDashboardPage } from "./pages/ml-dashboard.page";
import { MlFormComponent } from "./components/ml-form/ml-form.component";
import { MlChartComponent } from "./components/ml-chart/ml-chart.component";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MlDashboardRoutingModule } from "./ml-dashboard-routing.module";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MlChartComponent,
    MlFormComponent,
    MlDashboardPage,
    MlDashboardRoutingModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule
  ]
})
export class MlDashboardModule {}
