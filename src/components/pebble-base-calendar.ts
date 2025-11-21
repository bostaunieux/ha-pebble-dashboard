import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { property } from "lit/decorators.js";
import { isSameDay, isWithinInterval, format } from "date-fns";
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
          (a.allDay ? -1 : a.start.getHours() * 60 + a.start.getMinutes()) -
          (b.allDay ? -1 : b.start.getHours() * 60 + b.start.getMinutes()),
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

    const color = event.color ? `var(--color-${event.color})` : undefined;

    // TODO: Need to handle different start/end combinations
    // i.e. different days and all day events
    const formatTokens = "h:mmaaa";

    const iconStyles = styleMap({
      color,
    });

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${html`<div class="header_title">
          <ha-icon-button
            .label=${this.hass?.localize("ui.dialogs.generic.close") ?? "Close"}
            dialogAction="close"
            class="header_button"
            ><ha-icon icon="mdi:close"></ha-icon
          ></ha-icon-button>
          <span>${event.eventData.summary}</span>
        </div>`}
      >
        <div class="event-dialog-content">
            <ha-icon icon="mdi:calendar-account" style=${iconStyles}></ha-icon>
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
          --arrow-radius: 4px;
          --card-padding: 16px;

          --month-header-height: 62px;
        }

        ha-card {
          font-size: var(--pebble-font-size, var(--card-primary-font-size, 16px));
          padding: var(--card-padding);
          background-size: cover;
          height: 100%;
          display: grid;
          align-items: end;
        }

        ha-dialog {
          --mdc-dialog-min-width: min(400px, 95vw);
          --mdc-dialog-max-width: min(400px, 95vw);
        }

        .calendar-event.past:not(.timed) {
          opacity: 0.6;
        }

        .calendar-event.past.timed::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
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
          white-space: pre-wrap;
        }

        .calendar-event {
          font-size: 0.5em;
          line-height: 120%;
          margin: 4px 0;
          text-align: left;
          cursor: pointer;
          font-family: var(--mdc-typography-font-family);
          border: none;
          background: none;
          width: 100%;
          -webkit-font-smoothing: inherit;
          -moz-osx-font-smoothing: inherit;
          -webkit-appearance: none;
        }

        .calendar-event.all-day {
          color: #000;
          padding: 2px 6px;
          box-sizing: border-box;
        }

        .calendar-event.all-day:not(.spanning) {
          border-radius: 4px;
        }

        .calendar-event .event-text {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow-y: hidden;
          white-space: normal;
          word-break: break-all;
        }

        .calendar-event.spanning {
          position: relative;
          z-index: 1;
        }

        .calendar-event.spanning.begin {
          border-top-left-radius: var(--arrow-radius, 4px);
          border-bottom-left-radius: var(--arrow-radius, 4px);
        }

        .calendar-event.spanning.end {
          border-top-right-radius: var(--arrow-radius, 4px);
          border-bottom-right-radius: var(--arrow-radius, 4px);
        }

        /* Left arrow for spanning events */
        .calendar-event.spanning:not(.begin):before {
          content: "";
          display: block;
          width: 0;
          height: 0;
          clip-path: polygon(100% 0, 0 50%, 100% 100%);
          position: absolute;
          top: 0px;
          left: -12px;
          width: 12.5px;
          height: 100%;
          background: inherit;
          aspect-ratio: cos(30deg);
          mask:
            linear-gradient(90deg, #0000 calc(var(--arrow-radius, 4px) / sqrt(2)), #000 0),
            radial-gradient(
              var(--arrow-radius, 4px) at calc(var(--arrow-radius, 4px) * sqrt(2)) 50%,
              #000 98%,
              #0000 101%
            );
          -webkit-mask:
            linear-gradient(90deg, #0000 calc(var(--arrow-radius, 4px) / sqrt(2)), #000 0),
            radial-gradient(
              var(--arrow-radius, 4px) at calc(var(--arrow-radius, 4px) * sqrt(2)) 50%,
              #000 98%,
              #0000 101%
            );
        }

        /* Right arrow for spanning events */
        .calendar-event.spanning:not(.end):after {
          content: "";
          display: block;
          width: 0;
          height: 0;
          clip-path: polygon(0 0, 0 100%, 100% 50%);
          position: absolute;
          top: 0px;
          right: -12px;
          width: 12px;
          height: 100%;
          background: inherit;
          aspect-ratio: cos(30deg);
          mask:
            linear-gradient(-90deg, #0000 calc(var(--arrow-radius, 4px) / sqrt(2)), #000 0),
            radial-gradient(
              var(--arrow-radius, 4px) at calc(100% - var(--arrow-radius, 4px) * sqrt(2)) 50%,
              #000 98%,
              #0000 101%
            );
          -webkit-mask:
            linear-gradient(-90deg, #0000 calc(var(--arrow-radius, 4px) / sqrt(2)), #000 0),
            radial-gradient(
              var(--arrow-radius, 4px) at calc(100% - var(--arrow-radius, 4px) * sqrt(2)) 50%,
              #000 98%,
              #0000 101%
            );
        }

        .calendar-event.timed {
          --event-top-spacing: 2px;
          --highlight-color: var(--event-color);
          --text-color: hsl(from var(--event-color) h s calc(l + 15));
          display: flex;
          flex-direction: column;
          position: absolute;
          border: 1px solid var(--main-background);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-color);
          font-size: 1em;
          padding: var(--event-top-spacing) 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
          text-align: left;
          background-color: var(--event-color);
          background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7));
          margin: 0;
        }

        .calendar-event.timed.past {
          --highlight-color: hsl(from var(--event-color) h s calc(l - 10));
          --text-color: hsl(from var(--event-color) h s calc(l + 10));
        }

        .calendar-event.timed::before {
          content: "";
          position: absolute;
          height: calc(100% - var(--event-top-spacing) * 2);
          border-left: 4px solid var(--highlight-color);
        }

        .calendar-event.timed .event-title {
          margin-left: 6px;
        }

        .calendar-event.timed .event-time {
          font-size: 0.75em;
          line-height: 100%;
          margin-left: 6px;
        }
      `,
    ];
  }
}
