import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MlDashboardPage } from './pages/ml-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: MlDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MlDashboardRoutingModule {}
