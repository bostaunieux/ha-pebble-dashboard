import { html, css } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, state } from "lit/decorators.js";
import {
  format,
  startOfDay,
  isToday,
  Day,
  addDays,
  isSameDay,
  isWithinInterval,
  startOfWeek,
  eachDayOfInterval,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
} from "date-fns";
import { CalendarEvent } from "../utils/calendar-utils";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface EventPosition {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

@customElement("pebble-week-calendar")
class PebbleWeekCalendar extends PebbleBaseCalendar {
  @property({ attribute: false }) protected weekDays: 5 | 7 = 7;

  @state() private currentDate = startOfDay(Date.now());

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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

  private generateWeekDays() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const start = startOfWeek(this.currentDate, { weekStartsOn });
    const end = addDays(start, this.weekDays - 1);

    return eachDayOfInterval({ start, end });
  }

  private getEventPosition(
    event: CalendarEvent,
    allEventsForDay: CalendarEvent[],
  ): EventPosition {
    if (event.allDay) {
      return {
        event,
        top: 0,
        height: 30,
        left: 0,
        width: 100,
        zIndex: 1,
      };
    }

    // Calculate time-based positioning
    const eventStart = event.start;
    const eventEnd = event.end;

    // Convert to minutes from start of day
    const startMinutes = getHours(eventStart) * 60 + getMinutes(eventStart);
    const endMinutes = getHours(eventEnd) * 60 + getMinutes(eventEnd);

    // Calculate position (each hour = 60px, so each minute = 1px)
    const top = startMinutes;
    const height = endMinutes - startMinutes;

    // Handle overlapping events
    const overlappingEvents = allEventsForDay.filter(
      (e) => !e.allDay && e !== event && e.start < eventEnd && e.end > eventStart,
    );

    const totalOverlapping = overlappingEvents.length + 1;
    const eventIndex = allEventsForDay
      .filter((e) => !e.allDay && e.start < eventEnd && e.end > eventStart)
      .indexOf(event);

    const width = 100 / totalOverlapping;
    const left = eventIndex * width;

    return {
      event,
      top,
      height,
      left,
      width,
      zIndex: 2,
    };
  }

  private navigateWeek(direction: "prev" | "next") {
    const days = direction === "prev" ? -this.weekDays : this.weekDays;
    this.currentDate = addDays(this.currentDate, days);
  }

  private navigatePrev = () => this.navigateWeek("prev");
  private navigateNext = () => this.navigateWeek("next");

  render() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const weekDays = this.generateWeekDays();
    const adjustedDaysOfWeek = [
      ...DAYS_OF_WEEK.slice(weekStartsOn),
      ...DAYS_OF_WEEK.slice(0, weekStartsOn),
    ].slice(0, this.weekDays);

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="week-calendar-container">
          <!-- Header with month and navigation -->
          <div class="week-header">
            <div class="navigation">
              <ha-icon-button @click=${this.navigatePrev}>
                <ha-icon icon="mdi:chevron-left"></ha-icon>
              </ha-icon-button>
              <ha-icon-button @click=${this.navigateNext}>
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </ha-icon-button>
            </div>
          </div>

          <!-- Day headers -->
          <div class="day-headers">
            <div class="month-display">${format(weekDays[0], "MMM")}</div>
            ${weekDays.map((date, index) => {
              const dayName = adjustedDaysOfWeek[index];
              return html`
                <div class="wk-day-header">
                  <div class="wk-day-name">
                    ${this.localize(`calendar.card.calendar.week-days.${dayName}`)}
                  </div>
                  <div class="wk-day-number ${classMap({ today: isToday(date) })}">
                    ${date.getDate()}
                  </div>
                </div>
              `;
            })}
          </div>

          <!-- All day events row -->
          <div class="all-day-events">
            <div></div>
            ${weekDays.map((date, _index) => {
              const allDayEvents = this.getEventsForDay(date).filter((e) => e.allDay);
              return html`
                <div class="all-day-column">
                  ${allDayEvents.map((event) => this.renderAllDayEvent(event))}
                </div>
              `;
            })}
          </div>

          <!-- Time grid -->
          <div class="time-grid-container">
            

            <div class="time-grid">
            <div class="time-labels">
              ${HOURS.map(
                (hour) => html`
                  <div class="time-label">
                    ${format(setHours(setMinutes(new Date(), 0), hour), "ha")}
                  </div>
                `,
              )}
            </div>

              ${weekDays.map((date) => {
                const dayEvents = this.getEventsForDay(date).filter((e) => !e.allDay);
                return html`
                  <div class="day-column">
                    ${HOURS.map((_hour) => html`<div class="hour-slot"></div>`)}
                    ${dayEvents.map((event) => {
                      const position = this.getEventPosition(event, dayEvents);
                      return this.renderTimedEvent(event, position);
                    })}
                  </div>
                `;
              })}
            </div>
          </div>
        </div>
        ${this.renderEventDialog()}
      </ha-card>
    `;
  }

  renderAllDayEvent(event: CalendarEvent) {
    const color = `var(--color-${event.color ?? "blue"})`;
    const onClick = () => {
      this.selectedEvent = event;
    };

    return html`
      <button class="all-day-event" style="background-color: ${color}" @click=${onClick}>
        ${event.title}
      </button>
    `;
  }

  renderTimedEvent(event: CalendarEvent, position: EventPosition) {
    const color = `var(--color-${event.color ?? "blue"})`;
    const onClick = () => {
      this.selectedEvent = event;
    };

    const styles = {
      top: `${position.top}px`,
      height: `${position.height}px`,
      left: `${position.left}%`,
      width: `${position.width}%`,
      backgroundColor: color,
      zIndex: position.zIndex,
    };

    return html`
      <button class="timed-event" style=${styleMap(styles)} @click=${onClick}>
        ${event.title}
      </button>
    `;
  }

  static get styles() {
    return [
      super.sharedStyles,
      css`
        .week-calendar-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .week-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
        }

        .month-display {
          font-size: 1.5em;
          font-weight: bold;
        }

        .navigation {
          display: flex;
          gap: 8px;
        }

        .day-headers {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
        }

        .wk-day-header {
          margin: var(--day-margin, 5px);
          padding-bottom: 4px;
          border-bottom: 2px solid #ccc;
          font-size: 2em;
          display: flex;
          justify-content: space-between;
          place-items: center;
          line-height: 120%;
        }

        .wk-day-header.today {
          border-bottom: 3px solid var(--primary-text-color);
        }

        .wk-day-name {
          font-weight: bold;
        }

        .wk-day-number {
          display: inline-block;
          padding: 10px;
          border-radius: 100px;
          min-width: 1.25em;
          text-align: center;
        }

        .wk-day-number.today {
          background-color: rgb(68, 68, 68);
          padding: 10px;
        }

        .all-day-events {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          min-height: 40px;
        }

        .all-day-column {
          border-right: 1px solid var(--divider-color, #e0e0e0);
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .all-day-event {
          font-size: 1em;
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          text-align: left;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time-grid-container {
          flex: 1;
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          overflow-y: auto;
          max-height: 60vh;
          min-height: 0;
        }

        .time-labels {
          border-right: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
        }

        .time-label {
          height: 60px;
          padding: 4px 8px;
          font-size: 0.8em;
          color: var(--secondary-text-color, #666);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .time-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
        }

        .day-column {
          position: relative;
          border-right: 1px solid var(--divider-color, #e0e0e0);
        }

        .hour-slot {
          height: 60px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          box-sizing: border-box;
        }

        .timed-event {
          display: flex;
          position: absolute;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: #000;
          font-size: 1em;
          padding: 2px 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
          text-align: left;
          margin: 0 2px;
          border: 1px solid var(--main-background);
        }

        :host {
          --week-days: 7;
        }

        :host([week-days="5"]) {
          --week-days: 5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-week-calendar": PebbleWeekCalendar;
  }
}
