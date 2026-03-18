import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import type { MaterialResponse } from '../../../core/services/api';

const DISPLAY_LIMIT = 10;

@Component({
  selector: 'app-material-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-search-select.html',
  styleUrl: './material-search-select.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaterialSearchSelect),
      multi: true,
    },
  ],
})
export class MaterialSearchSelect implements ControlValueAccessor {
  @Input() options: MaterialResponse[] = [];

  open = signal(false);
  searchQuery = signal('');
  disabled = false;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};
  private _value: number | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private elRef: ElementRef<HTMLElement>
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.elRef.nativeElement.contains(e.target as Node)) {
      this.close();
    }
  }

  get value(): number | null {
    return this._value;
  }

  get displayedOptions(): MaterialResponse[] {
    const opts = this.options;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      const limited = opts.slice(0, DISPLAY_LIMIT);
      if (
        this._value != null &&
        !limited.some((o) => o.id === this._value)
      ) {
        const sel = opts.find((o) => o.id === this._value);
        if (sel)
          return [
            sel,
            ...limited.filter((o) => o.id !== this._value).slice(0, DISPLAY_LIMIT - 1),
          ];
      }
      return limited;
    }
    const filtered = opts.filter((o) =>
      o.name.toLowerCase().includes(q)
    );
    if (
      this._value != null &&
      !filtered.some((o) => o.id === this._value)
    ) {
      const sel = opts.find((o) => o.id === this._value);
      if (sel) return [sel, ...filtered];
    }
    return filtered;
  }

  get selectedLabel(): string {
    if (this._value == null) return 'Sélectionner';
    const m = this.options.find((o) => o.id === this._value);
    if (!m) return 'Sélectionner';
    return `${m.name} (${m.emissionFactor.toFixed(3)} kgCO₂e/${m.unit || 'kg'})`;
  }

  writeValue(value: number | null): void {
    this._value = value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this.disabled) return;
    this.open.update((v) => !v);
    if (!this.open()) this.searchQuery.set('');
    this.onTouched();
  }

  onSearchInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.searchQuery.set(v);
  }

  select(opt: MaterialResponse): void {
    this._value = opt.id;
    this.onChange(opt.id);
    this.open.set(false);
    this.searchQuery.set('');
    this.cdr.markForCheck();
  }

  close(): void {
    this.open.set(false);
    this.searchQuery.set('');
  }
}
