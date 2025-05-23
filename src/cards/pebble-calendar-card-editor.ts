import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CalendarEntity, CalendarCardConfig } from "./calendar-types";
import { getCardTextOptionsSchema } from "./card-options";
import { COLOR_CSS_VARS } from "../utils/colors";
import initLocalize, { LocalizationKey } from "../localize";
import type { HomeAssistant } from "../types";
import "../components/color-picker";
import { mdiWeatherHurricane } from "@mdi/js";

const computeLabel = (s: { label?: string }) => s.label;

@customElement("pebble-calendar-card-editor")
class PebbleCalendarCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config: CalendarCardConfig;

  private localize: (key: LocalizationKey) => string;

  constructor() {
    super();
    this._config = {
      type: "custom:pebble-calendar-card",
      calendars: [],
      num_weeks: 4,
      week_start: "0",
      events_span_days: false,
      enable_weather: false,
      event_refresh_interval: 15,
    };
    this.localize = initLocalize(this.hass);
  }

  setConfig(config: CalendarCardConfig) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  _getEventConfigSchema() {
    return [
      {
        label: this.localize("calendar.editor.form.event-format.label"),
        name: "events_span_days",
        selector: { boolean: {} },
      },
      {
        label: this.localize("calendar.editor.form.event-refresh-interval.label"),
        name: "event_refresh_interval",
        selector: { number: { mode: "box", min: 5 } },
      },
    ];
  }

  _getAddCalendarSchema(excludeEntities: string[]) {
    return {
      selector: {
        entity: {
          filter: [{ domain: "calendar" }],
          exclude_entities: excludeEntities,
        },
      },
      name: `calendar_new`,
      label: this.localize("calendar.editor.form.add-calendar.label"),
    };
  }

  _getCalendarSchema(excludeEntities: string[]) {
    return {
      name: `calendar_entity`,
      selector: {
        entity: {
          filter: [{ domain: "calendar" }],
          exclude_entities: excludeEntities,
        },
      },
      label: this.localize("calendar.editor.form.calendar.label"),
    };
  }

  _getWeeksSchema() {
    return {
      name: "",
      type: "grid",
      schema: [
        {
          label: this.localize("calendar.editor.form.week-start.label"),
          name: "week_start",
          selector: {
            select: {
              options: [
                // select only supports string value, so they must be converted when the config is used in the card
                {
                  label: this.localize("calendar.editor.form.week-start.days.sun"),
                  value: "0",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.mon"),
                  value: "1",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.tue"),
                  value: "2",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.wed"),
                  value: "3",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.thu"),
                  value: "4",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.fri"),
                  value: "5",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.sat"),
                  value: "6",
                },
              ],
            },
          },
        },
        {
          label: this.localize("calendar.editor.form.num-weeks.label"),
          name: "num_weeks",
          selector: { number: { mode: "box", min: 1 } },
        },
      ],
    };
  }

  _getWeatherSchema() {
    return {
      name: "",
      type: "expandable",
      iconPath: mdiWeatherHurricane,
      title: this.localize("weather.editor.form.forecast.title"),
      schema: [
        {
          label: this.localize("calendar.editor.form.enable-weather.label"),
          name: "enable_weather",
          selector: { boolean: {} },
        },
        ...(this._config.enable_weather
          ? [
              {
                label: this.localize("weather.editor.form.weather-entity.label"),
                name: "weather_entity",
                selector: { entity: { filter: [{ domain: "weather" }] } },
              },
            ]
          : []),
      ],
    };
  }

  _addCalendar(ev: CustomEvent) {
    if (!this._config) return;

    const calendars: CalendarEntity[] = this._config.calendars ?? [];

    this._config = {
      ...this._config,
      calendars: [...calendars, { entity: ev.detail.value.calendar_new }],
    };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeEventFormat(ev: CustomEvent) {
    if (!this._config) return;

    const { events_span_days, event_refresh_interval } = ev.detail.value;

    this._config = { ...this._config, events_span_days, event_refresh_interval };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeWeeks(ev: CustomEvent) {
    if (!this._config) return;

    const { num_weeks, week_start } = ev.detail.value;

    this._config = { ...this._config, num_weeks, week_start };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeTextScale(ev: CustomEvent) {
    if (!this._config) return;

    const { text_size } = ev.detail.value;

    this._config = { ...this._config, text_size };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeWeather(ev: CustomEvent) {
    if (!this._config) return;

    const { enable_weather, weather_entity } = ev.detail.value;

    this._config = { ...this._config, enable_weather, weather_entity };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeCalendar(ev: CustomEvent) {
    if (!this._config) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { calendarIndex } = ev.target as any;

    const entity = ev.detail.value.calendar_entity;

    const calendars: CalendarEntity[] = [...(this._config.calendars ?? [])];
    if (entity) {
      calendars[calendarIndex] = {
        entity,
        color: calendars[calendarIndex].color,
      };
    } else {
      calendars.splice(calendarIndex, 1);
    }
    this._config = { ...this._config, calendars };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeColor(ev: CustomEvent) {
    if (!this._config) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { calendarIndex } = ev.target as any;

    const calendars: CalendarEntity[] = [...(this._config.calendars ?? [])];
    calendars[calendarIndex] = {
      entity: calendars[calendarIndex].entity,
      color: ev.detail.value,
    };
    this._config = { ...this._config, calendars };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const calendars = this._config.calendars ?? [];
    const calendarEntities = calendars.map((c) => c.entity) ?? [];

    return html`
      <div class="card-config">
        <div id="editor">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${this._getEventConfigSchema()}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeEventFormat}
          ></ha-form>

          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${[this._getWeeksSchema()]}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeWeeks}
          ></ha-form>

          <div class="box">
            ${calendars.map((calendar, index) => {
              return html` <div class="calendar-entry">
                <ha-form
                  .hass=${this.hass}
                  .schema=${[this._getCalendarSchema(calendarEntities)]}
                  .data=${{ calendar_entity: calendar.entity }}
                  .computeLabel=${computeLabel}
                  .calendarIndex=${index}
                  @value-changed=${this._changeCalendar}
                ></ha-form>
                <pebble-calendar-color-picker
                  .hass=${this.hass}
                  .label=${this.localize("calendar.editor.form.calendar-color.label")}
                  .value=${calendar.color}
                  .localize=${this.localize}
                  .calendarIndex=${index}
                  @value-changed=${this._changeColor}
                >
                </pebble-calendar-color-picker>
              </div>`;
            })}

            <ha-form
              .hass=${this.hass}
              .data=${this._config}
              .schema=${[this._getAddCalendarSchema(calendarEntities)]}
              .computeLabel=${computeLabel}
              @value-changed=${this._addCalendar}
            ></ha-form>

            <ha-form
              .hass=${this.hass}
              .data=${this._config}
              .schema=${[this._getWeatherSchema()]}
              .computeLabel=${computeLabel}
              @value-changed=${this._changeWeather}
            ></ha-form>

            <ha-form
              .hass=${this.hass}
              .data=${this._config}
              .schema=${[getCardTextOptionsSchema(this.localize)]}
              .computeLabel=${computeLabel}
              @value-changed=${this._changeTextScale}
            ></ha-form>
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return [
      COLOR_CSS_VARS,
      css`
        .box {
          margin-top: 8px;
          border: 1px solid var(--divider-color);
          padding: 12px;
        }

        .calendar-entry {
          display: grid;
          grid-template-columns: minmax(150px, 7fr) minmax(150px, 5fr);
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-calendar-card-editor": PebbleCalendarCardEditor;
  }
}
