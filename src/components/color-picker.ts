import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { COLORS, ColorOption, computeCssColor } from "../utils/colors";
import { HomeAssistant } from "../types";
import { LocalizationKey } from "../localize";

const DEFAULT_VALUE = "default";

@customElement("pebble-calendar-color-picker")
export class ColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: (arg: LocalizationKey) => string;

  @property({ type: Boolean }) private disabled: boolean | null;

  @property() private label: string | null;

  @property() private value: string | null;

  public helper!: unknown;

  constructor() {
    super();
    this.disabled = false;
    this.label = null;
    this.value = null;
  }

  private _handleSelect(ev: CustomEvent<{ item: { value: string } }>) {
    ev.stopPropagation();
    const value = ev.detail?.item?.value;
    if (!value) return;
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: value !== DEFAULT_VALUE ? value : undefined },
      }),
    );
  }

  private _labelFor(value: string) {
    if (!this.localize) return value;
    return this.localize(`colorpicker.editor.options.${value}` as LocalizationKey);
  }

  private _renderValue = (value: string) => {
    const isDefault = !value || value === DEFAULT_VALUE;
    return html`
      <span slot="start" class="swatch">
        ${isDefault ? nothing : this._renderColorCircle(value as ColorOption)}
      </span>
      <span slot="headline">${this._labelFor(isDefault ? DEFAULT_VALUE : value)}</span>
    `;
  };

  render() {
    const currentValue = this.value || DEFAULT_VALUE;
    return html`
      <ha-dropdown
        placement="bottom"
        ?disabled=${this.disabled ?? false}
        @wa-select=${this._handleSelect}
      >
        <ha-picker-field
          slot="trigger"
          type="button"
          compact
          .label=${this.label}
          .value=${currentValue}
          .valueRenderer=${this._renderValue}
          .disabled=${this.disabled}
          .hideClearIcon=${true}
        ></ha-picker-field>
        <ha-dropdown-item
          .value=${DEFAULT_VALUE}
          .selected=${currentValue === DEFAULT_VALUE}
        >
          ${this._labelFor(DEFAULT_VALUE)}
        </ha-dropdown-item>
        ${Array.from(COLORS).map(
          (color) => html`
            <ha-dropdown-item .value=${color} .selected=${currentValue === color}>
              <span slot="icon">${this._renderColorCircle(color)}</span>
              ${this._labelFor(color)}
            </ha-dropdown-item>
          `,
        )}
      </ha-dropdown>
    `;
  }

  private _renderColorCircle(color: ColorOption) {
    return html`
      <span
        class="circle-color"
        style=${styleMap({
          "--circle-color": computeCssColor(color),
        })}
      ></span>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-dropdown {
        width: 100%;
        display: block;
      }
      ha-picker-field {
        width: 100%;
      }
      .swatch {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .circle-color {
        display: block;
        background-color: var(--circle-color);
        border-radius: 10px;
        width: 20px;
        height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-calendar-color-picker": ColorPicker;
  }
}
