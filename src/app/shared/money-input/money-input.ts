import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { numForEdit, numForInput, parseNumberBR } from '../../core/format';

@Component({
  selector: 'app-money-input',
  template: `
    <input
      class="input input--num"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      [id]="inputId()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      [placeholder]="placeholder()"
      [value]="display()"
      (focus)="onFocus($event)"
      (mouseup)="onMouseUp($event)"
      (input)="onInput($event)"
      (blur)="onBlur($event)"
    />
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoneyInput {
  readonly value = model<number | null>(null);
  readonly ariaLabel = input('');
  readonly inputId = input<string | null>(null);
  readonly placeholder = input('');
  readonly invalid = input(false);

  private readonly editing = signal(false);
  private readonly draft = signal('');
  private keepSelection = false;

  protected readonly display = computed(() => (this.editing() ? this.draft() : numForInput(this.value())));

  protected onFocus(event: FocusEvent): void {
    if (this.editing()) return;
    const el = event.target as HTMLInputElement;
    const text = numForEdit(this.value());
    this.draft.set(text);
    this.editing.set(true);
    el.value = text;
    el.select();
    this.keepSelection = true;
  }

  protected onMouseUp(event: MouseEvent): void {
    if (this.keepSelection) event.preventDefault();
    this.keepSelection = false;
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.keepSelection = false;
    this.draft.set(text);
    this.value.set(parseNumberBR(text));
  }

  protected onBlur(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    setTimeout(() => {
      if (document.activeElement === el) return;
      this.editing.set(false);
      this.keepSelection = false;
    });
  }
}
