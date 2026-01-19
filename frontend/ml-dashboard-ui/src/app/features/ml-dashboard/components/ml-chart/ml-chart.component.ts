import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from "@angular/core";
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-ml-chart',
  templateUrl: './ml-chart.component.html',
  styleUrls: ['./ml-chart.component.scss']
})
export class MlChartComponent implements AfterViewInit, OnChanges {

  @Input() data: any[] = [];
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;

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
  }

  render() {
    if (!this.data?.length || !this.canvas) return;

    // enforce a reasonable canvas height so Chart.js renders at expected size
    try {
      const el = this.canvas.nativeElement as HTMLCanvasElement;
      const targetHeight = (window?.innerWidth && window.innerWidth <= 600) ? 360 : 520;
      el.style.height = targetHeight + 'px';
      el.height = targetHeight;
    } catch (e) {
      // ignore in non-browser environments
    }

    // Build labels as "Year Q<quarter>" when possible, otherwise fallback to label or quarter
    const labels = this.data.map(d => {
      const year = d?.year ?? d?.y ?? null;
      const quarter = d?.quarter ?? d?.q ?? null;
      if (year != null && quarter != null) return `${year} Q${quarter}`;
      if (year != null) return `${year}`;
      if (quarter != null) return `Q${quarter}`;
      return d?.label ?? '';
    });

    // Use mishap_count as primary Y value, fallback to predicted_value or value
    const values = this.data.map(d => Number(d?.mishap_count ?? d?.predicted_value ?? d?.value ?? 0));

    // If chart exists, update its data and redraw
    if (this.chart) {
      this.chart.data.labels = labels as any;
      if (this.chart.data.datasets && this.chart.data.datasets[0]) {
        this.chart.data.datasets[0].data = values as any;
      } else {
        this.chart.data.datasets = [{ label: 'Future Prediction', data: values } as any];
      }
      this.chart.update();
      return;
    }

    // Create new chart
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Mishap Count',
          data: values,
          fill: false,
          borderColor: '#3f51b5',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#3f51b5',
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 16, right: 16, top: 8, bottom: 8 }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            title: { display: true, text: 'Year + Quarter' },
            ticks: { maxRotation: 0, autoSkip: false }
          },
          y: {
            display: true,
            // show only subtle horizontal lines for major ticks
            grid: {
              color: (ctx) => {
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
            title: { display: true, text: 'Mishap Count' }
          }
        }
      }
    });
  }

  private updateChart() {
    // Helper to re-render when data changes
    if (!this.data?.length || !this.chart) return;
    const labels = this.data.map(d => {
      const year = d?.year ?? d?.y ?? null;
      const quarter = d?.quarter ?? d?.q ?? null;
      if (year != null && quarter != null) return `${year} Q${quarter}`;
      if (year != null) return `${year}`;
      if (quarter != null) return `Q${quarter}`;
      return d?.label ?? '';
    });
    const values = this.data.map(d => Number(d?.mishap_count ?? d?.predicted_value ?? d?.value ?? 0));
    this.chart.data.labels = labels as any;
    if (this.chart.data.datasets && this.chart.data.datasets[0]) {
      this.chart.data.datasets[0].data = values as any;
    }
    this.chart.update();
  }
}
