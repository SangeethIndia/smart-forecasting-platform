import { Component, EventEmitter, Output, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MlRequest } from "../../../../shared/models/ml-request.model";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  selector: 'app-ml-form',
  templateUrl: './ml-form.component.html',
  styleUrls: ['./ml-form.component.scss']
})
export class MlFormComponent implements OnInit {
  entityType = 'MishapType';
  entityValue = '';
  nQuarters = 4;

  entityValues: string[] = [];
  quarters: number[] = [1, 2, 3, 4];

  @Output() submitForm = new EventEmitter<MlRequest>();

  ngOnInit() {
    this.onEntityTypeChange();
  }

  onEntityTypeChange() {
    if (this.entityType === 'MishapType') {
      this.entityValues = ['Aviation', 'Ground'];
    } else if (this.entityType === 'MishapClassification') {
      this.entityValues = ['A', 'B', 'C', 'D'];
    } else {
      this.entityValues = [];
    }

    // reset entityValue if it's not in the new list
    if (!this.entityValues.includes(this.entityValue)) {
      this.entityValue = this.entityValues[0] ?? '';
    }
  }

  submit() {
    this.submitForm.emit({
      entity_type: this.entityType,
      entity_value: this.entityValue,
      n_quarters: this.nQuarters
    });
  }
}
