import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { property } from "lit/decorators.js";
import {
  isSameDay,
  isWithinInterval,
  format,
} from "date-fns";
import { CalendarEvent } from "../utils/calendar-utils";
import { COLOR_CSS_VARS } from "../utils/colors";
import { LocalizationKey } from "../localize";
import { ForecastAttribute } from "../cards/weather-types";
import { HomeAssistant } from "../types";

export abstract class PebbleBaseCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) protected events: CalendarEvent[];

  @property({ attribute: false }) protected selectedEvent?: CalendarEvent;

  @property({ attribute: false }) protected weatherForecast?: Map<number, ForecastAttribute>;

  @property({ attribute: false }) protected textSize?: string;

  @property({ attribute: false }) protected localize: (key: LocalizationKey) => string;

  constructor() {
    super();
    this.events = [];
    this.localize = (arg) => arg;
  }

  protected getEventsForDay(currentDate: Date) {
    return this.events
      .filter(
        (event) =>
          isSameDay(event.start, currentDate) ||
          (event.allDay &&
            isWithinInterval(currentDate, {
              start: event.start,
              end: event.end ?? event.start,
            })),
      )
      .sort(
        (a, b) =>
          (a.allDay ? 0 : a.start.getHours() * 60 + a.start.getMinutes()) -
          (b.allDay ? 0 : b.start.getHours() * 60 + b.start.getMinutes()),
      );
  }

  protected renderForecast(forecast?: ForecastAttribute) {
    if (!forecast) {
      return html`<div></div>`;
    }
    return html` <div class="forecast">
      <div class="forecast-icon">
        <pebble-weather-icon
          .condition=${forecast.condition}
          .isNight=${false}
        ></pebble-weather-icon>
      </div>
      <div class="forecast-temp">
        ${forecast.templow ? html`<div>${forecast.templow}°</div>` : null}
        <div>${forecast.temperature}°</div>
      </div>
    </div>`;
  }

  private closeDialog() {
    this.selectedEvent = undefined;
  }

  protected renderEventDialog() {
    const event = this.selectedEvent;
    if (!event) {
      return nothing;
    }

    // TODO: Need to handle different start/end combinations
    // i.e. different days and all day events
    const formatTokens = "h:mmaaa";

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${html`<div class="header_title">
          <span>${event.eventData.summary}</span>
          <ha-icon-button
            .label=${this.hass?.localize("ui.dialogs.generic.close") ?? "Close"}
            dialogAction="close"
            class="header_button"
            ><ha-icon icon="mdi:close"></ha-icon
          ></ha-icon-button>
        </div>`}
      >
        <div class="event-dialog-content">
            <ha-icon icon="mdi:calendar-account"></ha-icon>
            <div class="event-dialog-info">
              ${this.hass.formatEntityAttributeValue(
                this.hass.states[event.calendar],
                "friendly_name",
              )}
            </div>
            <ha-icon icon="mdi:calendar-clock"></ha-icon>
            <div class="event-dialog-info">
              ${
                event.allDay
                  ? html`${this.localize("calendar.card.calendar.detail.all-day")}
                    ${!isSameDay(event.start, event.end)
                      ? html` (${format(event.start, "MMM d")} - ${format(event.end, "MMM d")})`
                      : nothing}`
                  : html`${format(event.start, formatTokens)} - ${format(event.end, formatTokens)}`
              }
            </div>

            ${
              event.eventData.description
                ? html` <div class="event-dialog-description">${event.eventData.description}</div> `
                : nothing
            }
          </div>
        </div>
      </ha-dialog>
    `;
  }

  static get baseStyles(): CSSResultGroup {
    return [
      COLOR_CSS_VARS,
      css`
        :host {
          --day-margin: 5px;
        }

        ha-card {
          font-size: var(--pebble-font-size, var(--card-primary-font-size, 16px));
          padding: 16px;
          background-size: cover;
          height: 100%;
          display: grid;
          align-items: end;
        }

        .past {
          opacity: 0.6;
        }

        .forecast {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          font-size: 0.5em;
          place-items: center;
          margin-top: -8px 0;
        }

        .forecast-temp {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          place-items: center;
          gap: 12px;
        }

        .event-dialog-content {
          display: grid;
          grid-template-columns: min-content 1fr;
          gap: 16px;
        }

        .event-dialog-description {
          grid-column: 1 / span 2;
          white-space: pre;
        }
      `,
    ];
  }
}
