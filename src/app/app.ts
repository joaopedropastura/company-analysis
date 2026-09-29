import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme';
import { UiState } from './core/services/ui-state';
import { ToastOutlet } from './shared/toast-outlet/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'ui.presenting() && ui.stopPresentation()',
  },
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly ui = inject(UiState);
}
