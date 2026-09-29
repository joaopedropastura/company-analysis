import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface VizTableData {
  columns: string[];
  rows: { label: string; values: string[] }[];
}

@Component({
  selector: 'app-viz-table',
  template: `
    <div class="table-scroll">
      <table class="data-table data-table--compact">
        <caption class="visually-hidden">{{ caption() }}</caption>
        <thead>
          <tr>
            @for (col of data().columns; track $index) {
              <th scope="col">{{ col }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of data().rows; track $index) {
            <tr>
              <th scope="row">{{ row.label }}</th>
              @for (v of row.values; track $index) {
                <td>{{ v }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VizTable {
  readonly data = input.required<VizTableData>();
  readonly caption = input('');
}
