import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getCardTextOptionsSchema } from "./card-options";
import type { HomeAssistant } from "../types";
import initLocalize, { LocalizationKey } from "../localize";
import { CountdownCardConfig } from "./countdown-types";

const getSchema = (
  localize: (key: LocalizationKey) => string,
  hideIfNoEvent: boolean,
  hasEntity: boolean,
) => [
  {
    name: "entity",
    label: localize("countdown.editor.form.entity.label"),
    selector: { entity: { domain: "calendar" } },
  },
  // Only show date/label inputs if no calendar entity is selected
  ...(!hasEntity
    ? [
        {
          name: "date",
          label: localize("countdown.editor.form.date.label"),
          selector: { text: {} },
        },
        {
          name: "title",
          label: localize("countdown.editor.form.title.label"),
          selector: { text: {} },
        },
      ]
    : []),
  {
    name: "hide_if_no_event",
    label: localize("countdown.editor.form.hide-if-no-event.label"),
    selector: { boolean: {} },
  },
  ...(!hideIfNoEvent
    ? [
        {
          name: "no_event_text",
          label: localize("countdown.editor.form.no-event-text.label"),
          selector: { text: {} },
        },
      ]
    : []),
  {
    name: "alignment",
    label: localize("countdown.editor.form.alignment.label"),
    selector: {
      select: {
        options: [
          {
            label: localize("countdown.editor.form.alignment.option.start"),
            value: "start",
          },
          {
            label: localize("countdown.editor.form.alignment.option.center"),
            value: "center",
          },
          {
            label: localize("countdown.editor.form.alignment.option.end"),
            value: "end",
          },
        ],
      },
    },
  },
  getCardTextOptionsSchema(localize),
];

const computeLabel = (s: { label?: string }) => s.label;

@customElement("pebble-countdown-card-editor")
class PebbleCountdownCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: CountdownCardConfig;

  get localize() {
    return initLocalize(this.hass);
  }

  setConfig(config: CountdownCardConfig) {
    this._config = {
      hide_if_no_event: false, // Default to false (show text)
      text_size: 100,
      ...config,
    };
  }

  _valueChanged(ev: CustomEvent) {
    this._config = { ...this._config, ...ev.detail.value };

    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${getSchema(
          this.localize,
          this._config.hide_if_no_event ?? false,
          !!this._config.entity,
        )}
        .computeLabel=${computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-countdown-card-editor": PebbleCountdownCardEditor;
  }
}
