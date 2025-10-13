import { html, css, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, query, state } from "lit/decorators.js";
import {
  format,
  startOfDay,
  isToday,
  isBefore,
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
  isSameWeek,
  isPast,
  getDayOfYear,
} from "date-fns";
import {
  CalendarEvent,
  getEventsByWeekdays,
  getEventPosition,
  TimedEventPosition,
} from "../utils/calendar-utils";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

@customElement("pebble-week-calendar")
class PebbleWeekCalendar extends PebbleBaseCalendar {
  @property({ attribute: false }) protected weekStartsOn: Day = 0;
  @property({ attribute: false }) protected weekCalendarView:
    | "current_week"
    | "next_5_days"
    | "next_7_days" = "current_week";
  @property({ attribute: false }) protected eventsSpanDays: boolean = false;

  @state() private currentDate = startOfDay(Date.now());
  @state() private currentTime = new Date();

  @query(".time-grid-container") private timeGridContainer?: HTMLDivElement;

  private timeUpdateInterval?: number;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.startCurrentTimeTracking();

    setTimeout(() => {
      this.scrollTo8AM();
    }, 100);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopCurrentTimeTracking();
  }

  private startCurrentTimeTracking() {
    this.currentTime = new Date();
    this.timeUpdateInterval = window.setInterval(() => {
      const newTime = new Date();
      const oldDay = startOfDay(this.currentTime);
      const newDay = startOfDay(newTime);
      
      this.currentTime = newTime;
      
      // If the day has changed and we're currently viewing the current week/period,
      // update currentDate to keep showing the current week/period
      if (!isSameDay(oldDay, newDay)) {
        // Check if the displayed date range includes the previous "today"
        const weekDays = this.generateWeekDays();
        const wasShowingToday = weekDays.some((day) => isSameDay(day, oldDay));
        
        // Only auto-advance if we were showing today before the day changed
        if (wasShowingToday) {
          this.currentDate = newDay;
        }
      }
    }, 60 * 1_000); // Update every minute
  }

  private stopCurrentTimeTracking() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = undefined;
    }
  }

  private isCurrentWeek(): boolean {
    const weekCalendarView = this.weekCalendarView ?? "current_week";
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;

    if (weekCalendarView === "current_week") {
      // For current week view, check if we're showing the current week
      const weekStart = startOfWeek(this.currentDate, { weekStartsOn });
      const currentWeekStart = startOfWeek(this.currentTime, { weekStartsOn });
      return isSameWeek(weekStart, currentWeekStart, { weekStartsOn });
    } else {
      // For next_5_days and next_7_days, check if today is within the displayed range
      const weekDays = this.generateWeekDays();
      const today = startOfDay(this.currentTime);
      return weekDays.some((day) => isSameDay(day, today));
    }
  }

  private getCurrentHour(): number {
    return getHours(this.currentTime);
  }

  private getCurrentMinute(): number {
    return getMinutes(this.currentTime);
  }

  private isCurrentDay(date: Date): boolean {
    return isSameDay(date, this.currentTime);
  }

  private scrollTo8AM() {
    const targetHour = 8; // 8am

    // Calculate the position of 8am (each hour = 60px, so each minute = 1px)
    const targetPosition = targetHour * 60;

    this.timeGridContainer?.scroll({
      top: Math.max(0, targetPosition),
    });
  }

  private generateWeekDays() {
    const weekCalendarView = this.weekCalendarView ?? "current_week";
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;

    let start: Date;
    let end: Date;

    switch (weekCalendarView) {
      case "current_week":
        // Start from the beginning of the current week, show 7 days
        start = startOfWeek(this.currentDate, { weekStartsOn });
        end = addDays(start, 6);
        break;
      case "next_5_days":
        // Start from current day, show next 5 days
        start = startOfDay(this.currentDate);
        end = addDays(start, 4);
        break;
      case "next_7_days":
        // Start from current day, show next 7 days
        start = startOfDay(this.currentDate);
        end = addDays(start, 6);
        break;
      default:
        start = startOfWeek(this.currentDate, { weekStartsOn });
        end = addDays(start, 6);
    }

    return eachDayOfInterval({ start, end });
  }

  private getEventsForWeek(weekStart: Date, weekEnd: Date) {
    const weekInterval = { start: weekStart, end: weekEnd };

    return this.events
      .filter(
        (event) =>
          isWithinInterval(event.start, weekInterval) ||
          isWithinInterval(event.end, weekInterval) ||
          (event.start <= weekStart && event.end >= weekEnd),
      )
      .sort(
        (a, b) =>
          (a.allDay ? -1 : a.start.getHours() * 60 + a.start.getMinutes()) -
          (b.allDay ? -1 : b.start.getHours() * 60 + b.start.getMinutes()),
      );
  }

  private navigateWeek(direction: "prev" | "next") {
    const weekCalendarView = this.weekCalendarView ?? "current_week";
    const multiplier = direction === "prev" ? -1 : 1;
    const days = weekCalendarView === "next_5_days" ? 5 : 7;

    this.currentDate = addDays(this.currentDate, days * multiplier);

    this.dispatchEvent(
      new CustomEvent("date-range-changed", {
        detail: {
          currentDate: this.currentDate,
        },
      }),
    );
  }

  private navigatePrev = () => this.navigateWeek("prev");
  private navigateNext = () => this.navigateWeek("next");

  render() {
    const weekDays = this.generateWeekDays();

    // Get events organized by weekdays if spanning is enabled
    let weekEvents: Array<Array<CalendarEvent>> = [];
    if (this.eventsSpanDays) {
      // Use the actual displayed date range, not the week boundaries
      const weekStart = weekDays[0];
      const weekEnd = weekDays[weekDays.length - 1];
      weekEvents = getEventsByWeekdays(
        this.getEventsForWeek(weekStart, weekEnd),
        weekStart,
        weekEnd,
      );
    }

    const maxEventsPerDay = Math.max(
      ...weekEvents.map((day) => day.filter((event) => event.allDay).length),
    );

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
      "--week-days": weekDays.length,
      "--max-events-per-day": maxEventsPerDay,
    };

    const monthName = format(this.isCurrentWeek() ? this.currentDate : weekDays[1], "MMMM u");

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="week-calendar">
          <div class="month-header">
            <div class="month-name">${monthName}</div>
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
            <div></div>
            ${weekDays.map((date) => {
              const dayName = DAYS_OF_WEEK[date.getDay()];
              return html`
                <div class="day-header ${classMap({ today: isToday(date) })}">
                  <div class="day-name">
                    ${this.localize(`calendar.card.calendar.week-days.${dayName}`)}
                  </div>
                  <div class="numeral">${date.getDate()}</div>
                </div>
              `;
            })}
          </div>

          ${this.weatherForecast
            ? html`
                <div class="forecast-row">
                  <div></div>
                  ${weekDays.map((date) => {
                    const forecast = this.weatherForecast?.get(getDayOfYear(date));
                    return html`
                      <div class="forecast-cell">${this.renderForecast(forecast)}</div>
                    `;
                  })}
                </div>
              `
            : nothing}
          <!-- All day events row -->
          <div class="all-day-events">
            <div class="time-labels-spacer"></div>
            ${weekDays.map((date, index) => {
              let allDayEvents: CalendarEvent[] = [];
              if (this.eventsSpanDays && weekEvents.length > 0) {
                // Use spanning events logic
                allDayEvents = weekEvents[index]?.filter((e) => e.allDay) || [];
              } else {
                // Use simple per-day logic
                allDayEvents = this.getEventsForDay(date).filter((e) => e.allDay);
              }

              return html`
                <div class="all-day-column ${classMap({ spanning: this.eventsSpanDays })}">
                  ${allDayEvents.map((event) =>
                    event
                      ? html`
                          <div>
                            ${this.eventsSpanDays
                              ? this.renderSpanningAllDayEvent(
                                  event,
                                  date,
                                  weekDays[0],
                                  weekDays[weekDays.length - 1],
                                )
                              : this.renderAllDayEvent(event)}
                          </div>
                        `
                      : html`<div></div>`,
                  )}
                </div>
              `;
            })}
          </div>

          <div class="time-grid-container">
            <div class="time-grid">
              <div class="time-labels">
                ${HOURS.map(
                  (hour) => html`
                    <div
                      class="time-label ${classMap({
                        "current-hour": this.isCurrentWeek() && hour === this.getCurrentHour(),
                      })}"
                    >
                      <span class="text"
                        >${format(setHours(setMinutes(new Date(), 0), hour), "h")}

                        <span class="am-pm"
                          >${format(setHours(setMinutes(new Date(), 0), hour), "a")}</span
                        >
                      </span>
                    </div>
                  `,
                )}
              </div>

              ${weekDays.map((date) => {
                const dayEvents = this.getEventsForDay(date).filter((e) => !e.allDay);
                const isCurrentDay = this.isCurrentDay(date);
                return html`
                  <div
                    class="day-column ${classMap({
                      "current-day": isCurrentDay,
                    })}"
                  >
                    ${HOURS.map(
                      (hour) => html`
                        <div
                          class="hour-slot ${classMap({
                            "current-hour": this.isCurrentWeek() && hour === this.getCurrentHour(),
                          })}"
                        ></div>
                      `,
                    )}
                    ${dayEvents.map((event) => {
                      const position = getEventPosition(event, dayEvents);
                      return this.renderTimedEvent(event, position);
                    })}
                    ${isCurrentDay && this.isCurrentWeek()
                      ? html`
                          <div
                            class="current-time-line"
                            style=${styleMap({
                              top: `${(this.getCurrentHour() * 60 + this.getCurrentMinute()) * (60 / 60)}px`,
                            })}
                          ></div>
                        `
                      : ""}
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

    const classes = {
      "calendar-event": true,
      "all-day": true,
      past: isPast(event.end),
    };

    return html`
      <button class=${classMap(classes)} style="background-color: ${color}" @click=${onClick}>
        ${event.title}
      </button>
    `;
  }

  renderSpanningAllDayEvent(event: CalendarEvent, date: Date, weekStart: Date, weekEnd: Date) {
    if (event == null) {
      return html`<span></span>`;
    }

    const weekDays = this.generateWeekDays();

    // Only render the event on its start day or if it's the first day of the displayed range
    const isFirstDayOfRange = isSameDay(date, weekDays[0]);
    if (!isSameDay(event.start, date) && !isFirstDayOfRange) {
      return html`<span></span>`;
    }

    const content = event.title;
    let daysInterval = event.daysInterval;

    if (daysInterval > 1) {
      if (isSameDay(event.start, date)) {
        // Event starts on this day - calculate how many days it can span within the displayed range
        const startIndex = weekDays.findIndex((day) => isSameDay(day, date));
        const endIndex = weekDays.findIndex((day) => isSameDay(day, event.end));

        if (endIndex !== -1) {
          // Event ends within the displayed range
          daysInterval = endIndex - startIndex + 1;
        } else {
          // Event ends beyond the displayed range
          const remainingDays = weekDays.length - startIndex;
          daysInterval = Math.min(remainingDays, daysInterval);
        }
      } else {
        // Event continues from a previous day
        const startIndex = weekDays.findIndex((day) => isSameDay(day, event.start));
        const currentIndex = weekDays.findIndex((day) => isSameDay(day, date));
        const endIndex = weekDays.findIndex((day) => isSameDay(day, event.end));

        if (endIndex !== -1) {
          // Event ends within the displayed range
          daysInterval = endIndex - currentIndex + 1;
        } else {
          // Event ends beyond the displayed range
          const remainingDays = weekDays.length - currentIndex;
          daysInterval = Math.min(remainingDays, daysInterval - (currentIndex - startIndex));
        }
      }
    }

    const color = `var(--color-${event.color ?? "blue"})`;
    const styles = {
      backgroundColor: color,
      color: "#000",
      width: `calc((${daysInterval} * 100%) + (${daysInterval - 1} * var(--day-margin) * 2))`,
    };

    const classes = {
      "calendar-event": true,
      "all-day": true,
      spanning: true,
      begin: isSameDay(event.start, date),
      end: isBefore(event.end, addDays(weekEnd, 1)),
      past: isPast(event.end),
    };

    const onClick = () => {
      this.selectedEvent = event;
    };

    return html`
      <button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
        <span class="event-text">${content}</span>
      </button>
    `;
  }

  private renderEventTime(startTime: Date, endTime: Date) {
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startIsAM = startHour < 12;
    const endIsAM = endHour < 12;

    let startFormatStr = "h";
    if (startMinute !== 0) {
      startFormatStr += ":mm";
    }
    // Only add AM/PM to start if different from end time
    if (startIsAM !== endIsAM) {
      startFormatStr += "a";
    }

    let endFormatStr = "h";
    if (endMinute !== 0) {
      endFormatStr += ":mm";
    }
    // Always add AM/PM to end time
    endFormatStr += "a";

    const startStr = format(startTime, startFormatStr);
    const endStr = format(endTime, endFormatStr);

    return `${startStr} - ${endStr}`;
  }

  renderTimedEvent(event: CalendarEvent, position: TimedEventPosition) {
    const color = `var(--color-${event.color ?? "blue"})`;
    const onClick = () => {
      this.selectedEvent = event;
    };

    const classes = {
      "calendar-event": true,
      timed: true,
      past: isPast(event.end),
    };

    const area = position.width * position.height;
    const baseArea = 4500; // Reference area for 1em font size
    const fontSize = Math.max(0.5, Math.min(1, Math.round((100 * area) / baseArea) / 100));

    const topSpacing = position.height > 15 ? 2 : 1;
    const styles = {
      "--event-color": color,
      "--event-top-spacing": topSpacing ? `${topSpacing}px` : undefined,
      top: `${position.top}px`,
      height: `${position.height}px`,
      left: `${position.left}%`,
      width: `${position.width}%`,
      zIndex: position.zIndex,
      fontSize: `${fontSize}em`,
    };

    return html`
      <button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
        <div class="event-title">${event.title}</div>
        <div class="event-time">${this.renderEventTime(event.start, event.end)}</div>
      </button>
    `;
  }

  static get styles() {
    return [
      super.baseStyles,
      css`
        .week-calendar {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
        }

        .month-name {
          font-size: 1.5em;
          font-weight: bold;
          flex: 1;
          text-align: center;
        }

        .navigation {
          display: flex;
          gap: 4px;
        }

        .day-headers {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }

        .forecast-row {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          min-height: 40px;
        }

        .forecast-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: var(--day-margin, 5px);
          font-size: 2em;
        }

        .day-header {
          margin: var(--day-margin, 5px);
          padding-bottom: 4px;
          border-bottom: 2px solid #ccc;
          font-size: 1.75em;
          display: flex;
          gap: 8px;
          place-items: center;
          line-height: 120%;
        }

        .day-header.today {
          border-bottom: 3px solid var(--primary-text-color);
        }

        .day-header.today .day-name {
          font-weight: bold;
        }

        .numeral {
          display: inline-block;
          padding: 10px;
          border-radius: 100px;
          min-width: 1.25em;
          text-align: center;
        }

        .day-header.today .numeral {
          background-color: rgb(68, 68, 68);
          padding: 10px;
        }

        .all-day-events {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          align-items: start;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          min-height: 40px;
          font-size: 2em;
          line-height: 0.5em;
        }

        .all-day-column {
          gap: 2px;
          display: grid;
          align-items: start;
          margin: var(--day-margin, 5px);
        }

        .all-day-column.spanning {
          grid-template-rows: subgrid;
          grid-row: span 100;
        }

        /* prettier-ignore */
        .time-grid-container {
          flex: 1;
          position: relative;
          overflow-y: auto;
          --month-height: 62px;
          --week-day-height: 70px;
          --all-day-events-height: calc(10px + var(--max-events-per-day, 0) * 33px);
          max-height: calc(
            100vh - var(--header-height, 0) - var(--month-height) - var(--week-day-height) - var(--card-padding) - var(--all-day-events-height)
          );
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: var(--divider-color, #e0e0e0) transparent;
        }

        .time-grid-container::-webkit-scrollbar {
          width: 6px;
        }

        .time-grid-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .time-grid-container::-webkit-scrollbar-thumb {
          background-color: var(--divider-color, #e0e0e0);
          border-radius: 3px;
        }

        .time-grid-container::-webkit-scrollbar-thumb:hover {
          background-color: var(--secondary-text-color, #666);
        }

        .time-labels {
          border-right: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          padding-top: 16px;
          margin-top: -16px;
        }

        .time-label {
          height: 60px;
          font-size: 0.8em;
          color: var(--ha-color-text-secondary, #ccc);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          display: flex;
          align-items: start;
          box-sizing: border-box;
        }

        .time-label:first-child {
          border-top: 1px solid var(--divider-color, #e0e0e0);
        }

        .time-label .text {
          margin-top: -11px;
          background: var(--card-background-color, #fff);
          padding: 0 8px;
        }

        .time-label .am-pm {
          font-size: 0.75em;
          margin-right: 8px;
        }

        .time-label.current-hour .text {
          color: var(--primary-color, #03a9f4);
          font-weight: bold;
        }

        .time-grid {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          margin-top: -8px;
          padding-top: 16px;
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

        .hour-slot:first-child {
          border-top: 1px solid var(--divider-color, #e0e0e0);
        }

        .hour-slot.current-hour {
          background-color: rgba(var(--rgb-primary-color, 3, 169, 244), 0.05);
        }

        .day-column.current-day {
          background-color: rgba(var(--rgb-primary-color, 3, 169, 244), 0.02);
        }

        .current-time-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary-color, #03a9f4);
          z-index: 20;
          pointer-events: none;
        }

        .current-time-line::before {
          content: "";
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          background-color: var(--primary-color, #03a9f4);
          border-radius: 50%;
        }

        :host {
          --week-days: 7;
          --mdc-icon-size: 28px;
          --mdc-icon-button-size: 44px;
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
