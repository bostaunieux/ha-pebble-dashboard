import { html, css, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement } from "lit/decorators.js";
import "./pebble-calendar-month-header";
import {
  isPast,
  format,
  startOfDay,
  startOfWeek,
  isToday,
  Day,
  getDayOfYear,
  isSameDay,
  differenceInDays,
  isSameWeek,
  endOfWeek,
  interval,
  areIntervalsOverlapping,
  endOfDay,
} from "date-fns";
import { CalendarEvent, getEventsByWeekdays } from "../utils/calendar-utils";
import { PebbleMonthCalendar } from "./pebble-month-calendar";

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

@customElement("pebble-spanning-calendar")
class PebbleSpanningCalendar extends PebbleMonthCalendar {
  constructor() {
    super();
  }

  private getEventsForWeek(weekStart: Date, weekEnd: Date) {
    const weekInterval = interval(weekStart, weekEnd);

    return this.events
      .filter((event) =>
        areIntervalsOverlapping(weekInterval, interval(event.start, event.end ?? event.start), {
          inclusive: false,
        }),
      )

      .sort(
        (a, b) =>
          (a.allDay ? -1 : a.start.getHours() * 60 + a.start.getMinutes()) -
          (b.allDay ? -1 : b.start.getHours() * 60 + b.start.getMinutes()),
      );
  }

  render() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const today = startOfDay(Date.now());

    const adjustedDaysOfWeek = [
      ...DAYS_OF_WEEK.slice(weekStartsOn),
      ...DAYS_OF_WEEK.slice(0, weekStartsOn),
    ];

    // Generate all weeks in a continuous sequence
    const allWeeks = this.generateWeeksInMonth();

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="calendar-container">
          <pebble-calendar-month-header
            .monthName=${this.displayedMonth}
            .disabled=${false}
            .onNavigatePrev=${this.handleNavigatePrev}
            .onNavigateNext=${this.handleNavigateNext}
            .onNavigateToday=${this.handleNavigateToday}
          ></pebble-calendar-month-header>
          <div class="calendar-header">
            ${adjustedDaysOfWeek.map(
              (day, index) =>
                html`<div
                  class="day-name ${classMap({
                    "active-day": today.getDay() === index,
                  })}"
                >
                  ${this.localize(`calendar.card.calendar.week-days.${day}`)}
                </div>`,
            )}
          </div>
          <div class="calendar-scroll-area">
            <div class="calendar span-events">
              ${allWeeks.map((week) => {
                const weekStart = startOfWeek(week[0], { weekStartsOn });
                const weekEnd = endOfWeek(week[0], { weekStartsOn });
                const weekEvents = getEventsByWeekdays(
                  this.getEventsForWeek(weekStart, weekEnd),
                  weekStart,
                  weekEnd,
                );
                const monthName = format(week[week.length - 1], "MMMM yyyy");
                const yearWeekIndex = format(week[week.length - 1], "yyyy.ww");
                return html`
                  <div class="week" data-week-index=${yearWeekIndex} data-month-name=${monthName}>
                    ${week.map((date, dayIndex) => {
                      const events = weekEvents[dayIndex];
                      const forecast = this.weatherForecast?.get(getDayOfYear(date));
                      return html`<div class="day">
                        ${this.renderForecast(forecast)}
                        <div class="date ${classMap({ 
                          past: isPast(endOfDay(date)),
                          loading: this.isInitialRender
                        })}">
                          ${date.getDate() === 1
                            ? html`<div class="month">${format(date, "MMM")}</div>`
                            : nothing}
                          <div class="numeral ${classMap({ today: isToday(date) })}">
                            ${date.getDate()}
                          </div>
                        </div>
                        ${events.map((event) => this.renderEvent(event, date, weekStartsOn))}
                      </div>`;
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

  renderEvent(event: CalendarEvent | null, date: Date, weekStartsOn: Day) {
    if (event == null) {
      return html`<span></span>`;
    }

    if (!isSameDay(event.start, date) && date.getDay() !== weekStartsOn) {
      return html`<span></span>`;
    }

    let content = event.title;
    if (!event.allDay) {
      const formatTokens = event.start.getMinutes() === 0 ? "haaaaa" : "h:mmaaaaa";
      content = `${format(event.start, formatTokens)} • ${event.title}`;
    }

    let daysInterval = event.daysInterval;
    if (daysInterval > 1) {
      if (isSameDay(event.start, date)) {
        daysInterval = Math.min(7 - date.getDay() - weekStartsOn, daysInterval);
      } else {
        daysInterval = Math.min(7, daysInterval - differenceInDays(date, event.start));
      }
    }

    const color = `var(--color-${event.color ?? "blue"})`;
    const styles = {
      backgroundColor: event.allDay ? color : undefined,
      color: !event.allDay ? color : "#000",
      width:
        daysInterval <= 1
          ? undefined
          : `calc((${daysInterval} * 100%) + (${daysInterval - 1}) * var(--day-margin) * 2)`,
    };

    const classes = {
      "calendar-event": true,
      "all-day": event.allDay,
      spanning: true,
      begin: isSameDay(event.start, date),
      end: isSameWeek(event.end, date, { weekStartsOn }),
      past: isPast(event.end),
    };
    const onClick = () => {
      this.selectedEvent = event;
    };
    return html`<button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
      <span class="event-text">${content}</span>
    </button>`;
  }

  static get styles() {
    return [
      super.baseStyles,
      super.monthStyles,
      css`
        .week {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: min-content;
          grid-column: 1 / span 7;
          scroll-snap-align: start;
          overflow: visible;
          min-height: 125px;
        }

        .day {
          display: grid;
          grid-template-rows: subgrid;
          grid-row: span 100;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-spanning-calendar": PebbleSpanningCalendar;
  }
}
