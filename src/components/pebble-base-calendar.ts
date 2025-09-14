import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { property } from "lit/decorators.js";
import { isSameDay, isWithinInterval, Day, format, startOfWeek, startOfMonth, addDays, eachDayOfInterval } from "date-fns";
import { CalendarEvent } from "../utils/calendar-utils";
import { COLOR_CSS_VARS } from "../utils/colors";
import { LocalizationKey } from "../localize";
import { ForecastAttribute } from "../cards/weather-types";
import { HomeAssistant } from "../types";

export abstract class PebbleBaseCalendar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) protected weekStartsOn: Day;

  @property({ attribute: false }) protected numWeeks?: number;

  @property({ attribute: false }) protected startPosition?: "current_week" | "start_of_month";

  @property({ attribute: false }) protected events: CalendarEvent[];

  protected scrollContainer?: HTMLElement;

  @property({ attribute: false }) protected selectedEvent?: CalendarEvent;

  @property({ attribute: false }) protected weatherForecast?: Map<number, ForecastAttribute>;

  @property({ attribute: false }) protected textSize?: string;

  @property({ attribute: false }) protected localize: (key: LocalizationKey) => string;

  constructor() {
    super();
    this.weekStartsOn = 0;
    this.numWeeks = 12;
    this.startPosition = "current_week";
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

  protected generateWeeks() {
    const numWeeks = this.numWeeks ?? 12;
    const today = Date.now();
    const startPosition = this.startPosition ?? "current_week";
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;

    let startDate: Date;
    if (startPosition === "start_of_month") {
      startDate = startOfMonth(today);
    } else {
      // current_week - start from the beginning of the current week
      startDate = startOfWeek(today, { weekStartsOn });
    }

    const firstWeekStart = startOfWeek(startDate, { weekStartsOn });

    // Generate all weeks in the continuous range
    const weeks = [];
    for (let i = 0; i < numWeeks; i++) {
      const weekStart = addDays(firstWeekStart, i * 7);
      const weekEnd = addDays(weekStart, 6);
      weeks.push(eachDayOfInterval({ start: weekStart, end: weekEnd }));
    }

    return weeks;
  }

  protected setScrollContainer = (el: HTMLElement) => {
    this.scrollContainer = el;
  };

  protected handleScroll = () => {
    if (!this.scrollContainer) return;

    // This could be enhanced to detect which month is currently in view
    // and update currentMonthOffset accordingly
    // For now, we'll keep it simple
  };

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

  static get sharedStyles(): CSSResultGroup {
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

        .calendar {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: min-content;
          height: 100%;
          padding: 0 12px;
          overflow: visible;
        }

        .calendar-container {
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .calendar-scroll-area {
          height: min(100%, calc(100vh - var(--header-height)));
          overflow-y: scroll;
          overflow-x: hidden;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scroll-snap-type: y mandatory;
        }

        .calendar-scroll-area::-webkit-scrollbar {
          width: 6px;
        }

        .calendar-scroll-area::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }

        .calendar-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }

        .calendar-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }

        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
          padding: 0 12px;
        }

        .day {
          min-height: 100px;
          position: relative;
          overflow: visible;
        }

        .day-name,
        .day {
          margin: var(--day-margin, 5px);
          padding: 0 0 12px 0;
          border-bottom: 2px solid #ccc;
          font-size: 2em;
          line-height: 120%;
          text-align: right;
        }

        .day-name {
          display: inline-block;
          padding-right: 10px;
        }

        .day-name.active-day {
          border-bottom: 3px solid var(--primary-text-color);
          font-weight: bold;
        }

        .month {
          display: inline-block;
        }

        .numeral {
          display: inline-block;
          padding: 10px;
          border-radius: 100px;
          min-width: 1.25em;
          text-align: center;
        }

        .numeral.today {
          background-color: rgb(68, 68, 68);
          padding: 10px;
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
