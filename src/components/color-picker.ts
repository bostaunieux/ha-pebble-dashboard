import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { COLORS, ColorOption, computeCssColor } from "../utils/colors";
import { HomeAssistant } from "../types";
import { LocalizationKey } from "../localize";

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

  _valueSelected(ev: CustomEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (ev.target as any).value;
    if (value) {
      this.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: value !== "default" ? value : undefined },
        }),
      );
    }
  }

  render() {
    return html`
      <ha-select
        .icon=${Boolean(this.value)}
        .label=${this.label}
        .value=${this.value || "default"}
        .helper=${this.helper}
        .disabled=${this.disabled}
        @closed=${this._onClose}
        @selected=${this._valueSelected}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${this.value
          ? html`
              <span slot="icon">
                ${this._renderColorCircle((this.value as ColorOption) || "grey")}
              </span>
            `
          : nothing}
        <mwc-list-item value="default">
          ${this.localize("colorpicker.editor.options.default")}
        </mwc-list-item>
        ${Array.from(COLORS).map(
          (color) => html`
            <mwc-list-item .value=${color} graphic="icon">
              ${this.localize(`colorpicker.editor.options.${color}`)}
              <span slot="graphic">${this._renderColorCircle(color)}</span>
            </mwc-list-item>
          `,
        )}
      </ha-select>
    `;
  }

  _onClose(ev: CustomEvent) {
    ev.stopPropagation();
  }

  _renderColorCircle(color: ColorOption) {
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
      .circle-color {
        display: block;
        background-color: var(--circle-color);
        border-radius: 10px;
        width: 20px;
        height: 20px;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-calendar-color-picker": ColorPicker;
  }
}
