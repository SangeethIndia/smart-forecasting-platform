import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from "@angular/core";
import { Chart, registerables } from 'chart.js';
import { CommonModule } from "@angular/common";
Chart.register(...registerables);

@Component({
  selector: 'app-ml-chart',
  templateUrl: './ml-chart.component.html',
  styleUrls: ['./ml-chart.component.scss'],
  imports: [CommonModule]
})
export class MlChartComponent implements AfterViewInit, OnChanges {

  @Input() data: any[] = [];
  @Input() mode: 'year' | 'quarter' | 'classification' = 'year';
  @Input() isDrill = false;
  @Output() drill = new EventEmitter<{ entity: string; year?: number; quarter?: number; label?: string }>();
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  showInfo = false;

  ngAfterViewInit() {
    // If data already present when view initializes, render immediately
    if (this.data?.length) {
      this.render();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // If data input changed and the view (canvas) is ready, render or update chart
    if (changes['data'] && this.canvas) {
      // If chart already exists, update it; otherwise create it
      if (this.chart) {
        this.updateChart();
      } else {
        this.render();
      }
    }
    // If mode changed and chart exists, re-render to update axis title/labels
    if (changes['mode'] && this.canvas && this.chart) {
      this.updateChart();
    }
  }

  render() {
    if (!this.data?.length || !this.canvas) return;
    console.debug('[ml-chart] render called, data length', this.data ? this.data.length : 0);

    // enforce a reasonable canvas height so Chart.js renders at expected size
    try {
      const el = this.canvas.nativeElement as HTMLCanvasElement;
      const targetHeight = (window?.innerWidth && window.innerWidth <= 600) ? 360 : 520;
      el.style.height = targetHeight + 'px';
      el.height = targetHeight;
    } catch (e) {
      // ignore in non-browser environments
    }

    // Build labels (unique, sorted) as "Year Q<quarter>" or year-only or provided label
    const rows = this.data.map(d => ({
      year: (d?.year ?? d?.y) as number | null,
      quarter: (d?.quarter ?? d?.q) as number | null,
      label: d?.label ?? null
    }));

    // create unique label keys and human labels
    const labelMap = new Map<string, string>();
    rows.forEach(r => {
      const key = (r.year != null ? `${r.year}` : '') + (r.quarter != null ? `-Q${r.quarter}` : '') + (r.label && r.year == null && r.quarter == null ? `-${r.label}` : '');
      let human = '';
      if (r.year != null && r.quarter != null) {
        if (this.mode === 'quarter') {
          human = `${r.year}-Q${r.quarter}`;
        } else {
          human = `${r.year}`;
        }
      } else if (r.year != null) human = `${r.year}`;
      else if (r.quarter != null) human = `Q${r.quarter}`;
      else human = r.label ?? '';
      if (!labelMap.has(key)) labelMap.set(key, human);
    });

    // sort labels by year then quarter when possible
    const labels = Array.from(labelMap.keys()).sort((a, b) => {
      const aParts = a.split('-');
      const bParts = b.split('-');
      const aYear = Number(aParts[0]) || 0;
      const bYear = Number(bParts[0]) || 0;
      if (aYear !== bYear) return aYear - bYear;
      const aQ = aParts.find(p => p.startsWith('Q'))?.replace('Q', '') || '0';
      const bQ = bParts.find(p => p.startsWith('Q'))?.replace('Q', '') || '0';
      return Number(aQ) - Number(bQ);
    }).map(k => labelMap.get(k) as string);

  // Group data by entity_value + data_type so we can style actual vs predicted
  // as separate series (solid vs dotted). For classification drill (bars)
    // we keep the previous behavior (one series per classification value).
  const groups = new Map<string, any[]>();
    const now = new Date();

    // Current year (e.g. 2026)
    const currentYear = now.getFullYear();

    // getMonth() → 0–11
    // divide by 3 → 0–3.99
    // floor → 0–3
    // +1 → quarter 1–4
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    this.data.forEach(d => {
     if (this.mode === 'quarter') {
        if (d?.data_type !== 'predicted') return;

        const y = d?.year;
        const q = d?.quarter;

        // allow only future quarters (include the current quarter as it may
        // contain predicted values for the in-progress quarter). Previously
        // this used `q <= currentQuarter` which filtered out rows for the
        // current quarter; change to strictly less-than to keep current Q.
        if (
          y < currentYear ||
          (y === currentYear && q < currentQuarter)
        ) {
          return;
        }
      }
  const entity = d?.entity_value ?? 'unknown';
  const dtype = d?.data_type ?? 'actual';
  // Key by entity and data_type for line charts so we can render solid
  // lines for actual and dotted lines for predicted.
  const key = `${entity}::${dtype}`;
      // Keep only row-level entities (e.g. 'Aviation', 'Ground', 'A','B'..).
      // Exclude rows that have container/source labels like 'Mishap Report'
      // which are not entity values to be plotted.
      if (d?.entity_value && d?.entity_value !== 'Mishap Report' && d?.entity_value !== 'Near Miss') {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(d);
      }
    });

    // DEBUG: dump raw input and grouping info to help diagnose plotting vs tooltip
    try {
      // keep concise but informative
      console.debug('[ml-chart] raw data sample', (this.data || []).slice(0, 8));
    } catch (e) {}

    // color mapping for known entities
    let colorMap: Record<string, string>;

    if (this.mode == 'year') {
      colorMap = { Aviation: '#1f77b4', Ground: '#ff7f0e' };
    }
    else if (this.mode == 'quarter') {
      colorMap = { Aviation: '#1f77b4', Ground: '#ff7f0e' };
    }
    else if (this.mode == 'classification') {
      colorMap = {
                    A: '#2ca02c', // green
                    B: '#d62728', // red
                    C: '#9467bd', // purple
                    D: '#8c564b', // brown
                    E: '#17becf'  // teal
                  };
    }
    

  const datasets = Array.from(groups.entries()).map(([key, items]) => {
    // key is either "Entity::data_type" for lines or just entity for bars
    const parts = (key || '').split('::');
    const entity = parts[0];
    const dtype = parts[1] || 'actual';
      // build a map of label->value for this group. If both 'actual' and
      // 'predicted' entries exist for the same label, prefer the actual value.
      const valueMap = new Map<string, { value: number; hasActual: boolean }>();
      items.forEach(it => {
        const year = (it?.year ?? it?.y) as number | undefined;
        const quarter = (it?.quarter ?? it?.q) as number | undefined;
        let k = '';
        if (year != null && quarter != null) k = `${year}-Q${quarter}`;
        else if (year != null) k = `${year}`;
        else if (quarter != null) k = `Q${quarter}`;
        else k = it?.label ?? '';
        const value = Number(it?.mishap_count ?? it?.predicted_value ?? it?.value ?? 0);
        const dtype = it?.data_type ?? 'actual';
        const existing = valueMap.get(k);
        if (!existing) {
          valueMap.set(k, { value, hasActual: dtype === 'actual' });
        } else {
          // if existing is actual, keep it; otherwise replace with actual or latest
          if (!existing.hasActual && dtype === 'actual') {
            valueMap.set(k, { value, hasActual: true });
          } else if (!existing.hasActual && dtype !== 'actual') {
            // keep last-known predicted value (no-op - already set)
            valueMap.set(k, { value: valueMap.get(k) ? value : value, hasActual: false });
          }
        }
      });

      // align data with labels array
      const dataArr = labels.map(lbl => {
        // accept either '2026-Q1' or '2026 Q1' formats
        const m = lbl.match(/^(\d{4})[- ]Q(\d)$/);
        let k = lbl;
        if (m) k = `${m[1]}-Q${m[2]}`;
        else if (/^\d{4}$/.test(lbl)) k = lbl;
        else if (/^Q\d$/.test(lbl)) k = lbl;
        const entry = valueMap.get(k);
        return entry ? entry.value : null;
      });

      const color = colorMap[entity] ?? `hsl(${Math.abs(entity.length * 37) % 360} 70% 45%)`;
      if (this.mode === 'classification' && this.isDrill) {
        return {
          label: `${entity}`,
          data: dataArr,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1,
          categoryPercentage: 0.6,   // space between groups
          barPercentage: 0.6,        // thickness inside group
          maxBarThickness: 35,       // absolute max width
          borderRadius: 6
        } as any;
      }

      // For line charts, render actual as solid and predicted as dotted.
      return {
        label: `${entity} (${dtype})`,
        data: dataArr,
        fill: false,
        borderColor: color,
        borderWidth: dtype === 'actual' ? 2 : 2,
        borderDash: dtype === 'actual' ? [] : [6, 6],
        pointRadius: 3,
        pointBackgroundColor: color,
        tension: 0.2
      } as any;
    });

    // DEBUG: log labels and dataset sizes/first-values to help debugging
    try {
      console.debug('[ml-chart] labels', labels);
      console.debug('[ml-chart] datasets summary', datasets.map(ds => ({ label: ds.label, dataPreview: (ds.data || []).slice(0,6) })));
    } catch (e) {}

    // If chart exists, update its data and redraw
    if (this.chart) {
      this.chart.data.labels = labels as any;
      this.chart.data.datasets = datasets as any;
      this.chart.update();
      return;
    }

  // Determine a reasonable max ticks to avoid overcrowding on X axis
  const maxXTicks = Math.min(12, labels.length || 12);

    // Create new chart
  const chartType = (this.mode === 'classification' && this.isDrill) ? 'bar' : 'line';
    // Create a small plugin to draw data labels for bar charts (stacked or grouped).
    const dataLabelPlugin: any = {
      id: 'mlDataLabels',
      afterDatasetsDraw: (chartObj: any) => {
        try {
          if (chartObj.config.type !== 'bar') return;
          const isStacked = !!(chartObj.options && chartObj.options.scales && chartObj.options.scales.y && chartObj.options.scales.y.stacked);
          const ctx = chartObj.ctx;
          chartObj.data.datasets.forEach((dataset: any, dsIndex: number) => {
            const meta = chartObj.getDatasetMeta(dsIndex);
            meta.data.forEach((bar: any, index: number) => {
              const value = dataset.data && dataset.data[index];
              if (value == null) return;
              const top = bar.y;
              const bottom = bar.base;
              const x = bar.x || (bar.x === 0 ? 0 : (bar.getCenterPoint ? bar.getCenterPoint().x : 0));
              let textY = top;
              if (isStacked) {
                textY = (top + bottom) / 2;
              } else {
                textY = Math.max(8, top - 8);
              }
              // choose contrasting text color based on background if available
              let bg = dataset.backgroundColor || dataset.borderColor || '#000';
              if (Array.isArray(bg)) bg = bg[index] || bg[0];
              const hexToRgb = (h: string) => {
                try {
                  const m = h.match(/^#?([a-fA-F0-9]{6})$/);
                  if (!m) return null;
                  const int = parseInt(m[1], 16);
                  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
                } catch (e) { return null; }
              };
              let textColor = '#111';
              const rgb = hexToRgb(String(bg));
              if (rgb) {
                const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
                textColor = lum > 180 ? '#111' : '#fff';
              }
              ctx.save();
              ctx.fillStyle = textColor;
              ctx.font = '11px system-ui, Arial, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = isStacked ? 'middle' : 'bottom';
              ctx.fillText(String(value), x, textY);
              ctx.restore();
            });
          });
        } catch (e) {
          // swallow - debugging only
        }
      }
    };

    this.chart = new Chart(this.canvas.nativeElement, {
        type: chartType as any,
        data: {
          labels,
          datasets
        },
        plugins: [dataLabelPlugin],
        options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 16, right: 16, top: 8, bottom: 8 }
        },
        plugins: {
          // show legend positioned to the right (beside Y axis) per request
          legend: { display: true, position: 'right', labels: { font: { size: 12 } } }
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            title: { display: true, text: (this.mode === 'quarter' ? 'Year + Quarter' : 'Year') },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: maxXTicks },
            stacked: false
          },
          y: {
            display: true,
            // hide Y-axis tick labels when showing stacked classification drill
            ticks: { display: !(this.mode === 'classification' && this.isDrill) },
            // show only subtle horizontal lines for major ticks
            grid: {
              color: (ctx: any) => {
                // ctx.tick.major should be true for major ticks in Chart.js
                // fall back: if major flag not present, show every second grid line
                try {
                  if (ctx.tick && ctx.tick.major) return 'rgba(16,24,40,0.06)';
                } catch (e) {}
                // fallback based on index (if available)
                if (typeof (ctx.index) === 'number') {
                  return (ctx.index % 2 === 0) ? 'rgba(16,24,40,0.04)' : 'rgba(0,0,0,0)';
                }
                return 'rgba(0,0,0,0)';
              },
              // do not change axis border via Chart.js types (handled by CSS)
            },
            title: { display: true, text: 'Mishap Count' },
            stacked: false
          }
        }
        // Chart click handler for drill-down
      , onClick: (evt: any, elements: any[]) => {
          try {
            if (!elements || !elements.length) return;
              console.debug('[ml-chart] onClick', { elements, evt });
            const el = elements[0];
            const dsIndex = el.datasetIndex;
            const idx = el.index;
            const ds = (this.chart.data.datasets as any[])[dsIndex];
            const label = (this.chart.data.labels as any[])[idx];
            // Try to parse year and quarter from label
            const m = (label || '').toString().match(/^(\d{4})(?:-Q(\d))?$/);
            const year = m ? Number(m[1]) : undefined;
            const quarter = m && m[2] ? Number(m[2]) : undefined;
            let entity = ds && ds.label ? ds.label.toString() : undefined;
            if (entity) {
              // strip any " (predicted)" suffix added to legend labels
              entity = entity.replace(/\s*\(.*\)$/, '');
              this.drill.emit({ entity, year, quarter, label });
            }
          } catch (e) {
            // swallow errors to avoid breaking chart interactions
          }
        }
      }
    });
  }

  toggleInfo(evt: Event) {
    try { evt.stopPropagation(); } catch (e) {}
    this.showInfo = !this.showInfo;
  }

  private updateChart() {
    // Helper to re-render when data changes
    if (!this.data?.length) return;
    // Destroy and re-render to fully rebuild datasets/labels according to mode
    try {
      if (this.chart) {
        this.chart.destroy();
        // clear reference so render() will create a fresh chart
        // @ts-ignore
        this.chart = undefined;
      }
    } catch (e) {}
    this.render();
  }
}
