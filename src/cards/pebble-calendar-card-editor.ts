import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CalendarEntity, CalendarCardConfig } from "./calendar-types";
import { getCardTextOptionsSchema } from "./card-options";
import { COLOR_CSS_VARS } from "../utils/colors";
import initLocalize from "../localize";
import type { HomeAssistant } from "../types";
import "../components/color-picker";
import { mdiWeatherHurricane } from "@mdi/js";

const computeLabel = (s: { label?: string }) => s.label;

@customElement("pebble-calendar-card-editor")
class PebbleCalendarCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config: CalendarCardConfig;

  get localize() {
    return initLocalize(this.hass);
  }
  
  constructor() {
    super();
    this._config = {
      type: "custom:pebble-calendar-card",
      calendars: [],
      show_interactive_controls: false,
      view_toggle_location: "header",
      view_type: "month",
      event_refresh_interval: 15,
      enable_weather: false,
      // View-specific overrides (initially empty)
      month_view: {},
      week_view: {},
      agenda_view: {},
    };
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

  _getGlobalConfigSchema() {
    // Use show_interactive_controls with fallback to show_view_toggle for backward compatibility
    const showInteractiveControls =
      this._config.show_interactive_controls ?? this._config.show_view_toggle ?? false;

    return [
      {
        label: this.localize("calendar.editor.form.show-interactive-controls.label"),
        name: "show_interactive_controls",
        selector: { boolean: {} },
      },
      ...(showInteractiveControls
        ? [
            {
              label: this.localize("calendar.editor.form.view-toggle-location.label"),
              name: "view_toggle_location",
              selector: {
                select: {
                  options: [
                    {
                      value: "header",
                      label: this.localize(
                        "calendar.editor.form.view-toggle-location.option.header",
                      ),
                    },
                    {
                      value: "floating",
                      label: this.localize(
                        "calendar.editor.form.view-toggle-location.option.floating",
                      ),
                    },
                  ],
                },
              },
            },
          ]
        : []),
      {
        label: this.localize("calendar.editor.form.view-type.label"),
        name: "view_type",
        selector: {
          select: {
            options: [
              {
                value: "month",
                label: this.localize("calendar.editor.form.view-type.option.month"),
              },
              {
                value: "week",
                label: this.localize("calendar.editor.form.view-type.option.week"),
              },
              {
                value: "agenda",
                label: this.localize("calendar.editor.form.view-type.option.agenda"),
              },
            ],
          },
        },
      },
    ];
  }

  _getMonthConfigSchema() {
    return {
      name: "",
      type: "expandable",
      title: this.localize("calendar.editor.form.month-config.title"),
      expanded: false,
      schema: [
        {
          name: "",
          type: "grid",
          schema: [
            {
              label: this.localize("calendar.editor.form.month-calendar-start.label"),
              name: "month_calendar_start",
              selector: {
                select: {
                  options: [
                    {
                      value: "current_week",
                      label: this.localize(
                        "calendar.editor.form.month-calendar-start.option.current_week",
                      ),
                    },
                    {
                      value: "start_of_month",
                      label: this.localize(
                        "calendar.editor.form.month-calendar-start.option.start_of_month",
                      ),
                    },
                  ],
                },
              },
            },
            {
              label: this.localize("calendar.editor.form.num-weeks.label"),
              name: "num_weeks",
              selector: { number: { min: 1, max: 24 } },
            },
          ],
        },
        {
          label: this.localize("calendar.editor.form.week-start.label"),
          name: "week_start",
          selector: {
            select: {
              options: [
                {
                  label: this.localize("calendar.editor.form.week-start.days.sun"),
                  value: "0",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.mon"),
                  value: "1",
                },
              ],
            },
          },
        },
        {
          label: this.localize("calendar.editor.form.event-format.label"),
          name: "events_span_days",
          selector: { boolean: {} },
        },
      ],
    };
  }

  _getWeekConfigSchema() {
    return {
      name: "",
      type: "expandable",
      title: this.localize("calendar.editor.form.week-config.title"),
      expanded: false,
      schema: [
        {
          label: this.localize("calendar.editor.form.week-calendar-view.label"),
          name: "week_calendar_view",
          selector: {
            select: {
              options: [
                {
                  value: "current_week",
                  label: this.localize(
                    "calendar.editor.form.week-calendar-view.option.current_week",
                  ),
                },
                {
                  value: "next_5_days",
                  label: this.localize(
                    "calendar.editor.form.week-calendar-view.option.next_5_days",
                  ),
                },
                {
                  value: "next_7_days",
                  label: this.localize(
                    "calendar.editor.form.week-calendar-view.option.next_7_days",
                  ),
                },
              ],
            },
          },
        },
        {
          label: this.localize("calendar.editor.form.week-start.label"),
          name: "week_start",
          selector: {
            select: {
              options: [
                {
                  label: this.localize("calendar.editor.form.week-start.days.sun"),
                  value: "0",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.mon"),
                  value: "1",
                },
              ],
            },
          },
        },
        {
          label: this.localize("calendar.editor.form.event-format.label"),
          name: "events_span_days",
          selector: { boolean: {} },
        },
      ],
    };
  }

  _getAgendaConfigSchema() {
    return {
      name: "",
      type: "expandable",
      title: this.localize("calendar.editor.form.agenda-config.title"),
      expanded: false,
      schema: [
        {
          label: this.localize("calendar.editor.form.week-start.label"),
          name: "week_start",
          selector: {
            select: {
              options: [
                {
                  label: this.localize("calendar.editor.form.week-start.days.sun"),
                  value: "0",
                },
                {
                  label: this.localize("calendar.editor.form.week-start.days.mon"),
                  value: "1",
                },
              ],
            },
          },
        },
      ],
    };
  }

  _getEventsSchema() {
    return {
      name: "",
      type: "expandable",
      title: this.localize("calendar.editor.form.events.title"),
      schema: [
        {
          label: this.localize("calendar.editor.form.event-refresh-interval.label"),
          name: "event_refresh_interval",
          selector: { number: { mode: "box", min: 5 } },
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

  _changeCalendarView(ev: CustomEvent) {
    if (!this._config) return;

    const { view_type, show_interactive_controls, view_toggle_location } = ev.detail.value;

    this._config = {
      ...this._config,
      view_type,
      show_interactive_controls,
      view_toggle_location,
    };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeMonthView(ev: CustomEvent) {
    if (!this._config) return;

    const monthView = ev.detail.value;

    // Clean up empty values
    const cleanedMonthView = { ...monthView };
    Object.keys(cleanedMonthView).forEach((key) => {
      if (
        cleanedMonthView[key] === "" ||
        cleanedMonthView[key] === null ||
        cleanedMonthView[key] === undefined
      ) {
        delete cleanedMonthView[key];
      }
    });

    this._config = {
      ...this._config,
      month_view: cleanedMonthView,
    };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeWeekView(ev: CustomEvent) {
    if (!this._config) return;

    const weekView = ev.detail.value;

    // Clean up empty values
    const cleanedWeekView = { ...weekView };
    Object.keys(cleanedWeekView).forEach((key) => {
      if (
        cleanedWeekView[key] === "" ||
        cleanedWeekView[key] === null ||
        cleanedWeekView[key] === undefined
      ) {
        delete cleanedWeekView[key];
      }
    });

    this._config = {
      ...this._config,
      week_view: cleanedWeekView,
    };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeAgendaView(ev: CustomEvent) {
    if (!this._config) return;

    const agendaView = ev.detail.value;

    // Clean up empty values
    const cleanedAgendaView = { ...agendaView };
    Object.keys(cleanedAgendaView).forEach((key) => {
      if (
        cleanedAgendaView[key] === "" ||
        cleanedAgendaView[key] === null ||
        cleanedAgendaView[key] === undefined
      ) {
        delete cleanedAgendaView[key];
      }
    });

    this._config = {
      ...this._config,
      agenda_view: cleanedAgendaView,
    };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _changeEvents(ev: CustomEvent) {
    if (!this._config) return;

    const { event_refresh_interval } = ev.detail.value;

    this._config = { ...this._config, event_refresh_interval };
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
        <div class="editor">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${this._getGlobalConfigSchema()}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeCalendarView}
          ></ha-form>

          <ha-form
            .hass=${this.hass}
            .data=${this._config?.month_view ?? {}}
            .schema=${[this._getMonthConfigSchema()]}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeMonthView}
          ></ha-form>

          <ha-form
            .hass=${this.hass}
            .data=${this._config?.week_view ?? {}}
            .schema=${[this._getWeekConfigSchema()]}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeWeekView}
          ></ha-form>

          <ha-form
            .hass=${this.hass}
            .data=${this._config?.agenda_view ?? {}}
            .schema=${[this._getAgendaConfigSchema()]}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeAgendaView}
          ></ha-form>

          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${[this._getEventsSchema()]}
            .computeLabel=${computeLabel}
            @value-changed=${this._changeEvents}
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
          </div>

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
        .editor {
          display: grid;
          gap: 16px;
        }

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
