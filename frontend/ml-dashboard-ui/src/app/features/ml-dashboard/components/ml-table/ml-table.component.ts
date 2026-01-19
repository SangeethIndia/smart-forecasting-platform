import { Component, Input, OnChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-ml-table',
  templateUrl: './ml-table.component.html',
  styleUrls: ['./ml-table.component.scss']
})
export class MlTableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() featureImportance: any[] = [];
  columns: string[] = [];

  ngOnChanges() {
    if (this.data?.length) {
      const keys = Object.keys(this.data[0]);

      // Preferred display order: Entity Type, Entity Value, Year, Quarter, Mishap Count
      const preferredOrder = [
        'entity_type',
        'entity_value',
        'year',
        'quarter',
        'mishap_count'
      ];

      const ordered = preferredOrder.filter(k => keys.includes(k));
      const others = keys.filter(k => !ordered.includes(k));

      this.columns = [...ordered, ...others];
    } else {
      this.columns = [];
    }
  }

  formatHeader(key: string) {
    if (!key) return '';
    return key
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
}
