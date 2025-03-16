import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CardTextOptions, getCardTextOptionsSchema } from "./card-options";
import type { HomeAssistant } from "../types";
import initLocalize, { LocalizationKey } from "../localize";

const getSchema = (localize: (key: LocalizationKey) => string) => [
  {
    name: "show_seconds",
    label: localize("clock.editor.form.show-seconds.label"),
    selector: { boolean: {} },
  },
  {
    name: "show_date",
    label: localize("clock.editor.form.show-date.label"),
    selector: { boolean: {} },
  },
  getCardTextOptionsSchema(localize),
];

const computeLabel = (s: { label?: string }) => s.label;

export type ClockCardConfig = {
  type: "custom:pebble-clock-card";
  show_seconds?: boolean;
  show_date?: boolean;
} & CardTextOptions;

@customElement("pebble-clock-card-editor")
class PebbleClockCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: ClockCardConfig;

  private localize: (key: LocalizationKey) => string;

  constructor() {
    super();

    this.localize = initLocalize(this.hass);
  }

  setConfig(config: ClockCardConfig) {
    this._config = { text_size: 100, ...config };
  }

  _valueChanged(ev: CustomEvent) {
    this._config = { ...this._config, ...ev.detail.value };

    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
    });
    this.dispatchEvent(event);
  }

  render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${getSchema(this.localize)}
        .computeLabel=${computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-clock-card-editor": PebbleClockCardEditor;
  }
}
