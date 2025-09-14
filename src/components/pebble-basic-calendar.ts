import { html, css, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement } from "lit/decorators.js";
import {
  addDays,
  eachDayOfInterval,
  isPast,
  format,
  startOfDay,
  startOfWeek,
  isToday,
  Day,
  getDayOfYear,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";
import { CalendarEvent } from "../utils/calendar-utils";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

@customElement("pebble-basic-calendar")
class PebbleBasicCalendar extends PebbleBaseCalendar {
  constructor() {
    super();
  }

  private calculateMonthsToRender() {
    if (!this.enableScrolling) {
      return [startOfMonth(Date.now())];
    }

    const bufferMonths = this.scrollBufferMonths ?? 2;
    const today = startOfMonth(Date.now());
    const months = [];

    // Start with current month
    months.push(today);

    // Add future months only
    for (let i = 1; i <= bufferMonths; i++) {
      months.push(addMonths(today, i));
    }

    return months;
  }

  private generateContinuousWeeks(monthsToRender: Date[], weekStartsOn: Day) {
    if (monthsToRender.length === 0) return [];
    
    // Start from the beginning of the current month (first day of the month)
    const firstMonthStart = monthsToRender[0];
    const firstWeekStart = startOfWeek(firstMonthStart, { weekStartsOn });
    
    // Find the end of the last week that contains the last month
    const lastMonthEnd = endOfMonth(monthsToRender[monthsToRender.length - 1]);
    const lastWeekEnd = startOfWeek(addDays(lastMonthEnd, 7), { weekStartsOn });
    
    // Generate all weeks in the continuous range
    const weeks = [];
    let currentWeekStart = firstWeekStart;
    
    while (currentWeekStart <= lastWeekEnd) {
      const weekEnd = addDays(currentWeekStart, 6);
      weeks.push(eachDayOfInterval({ start: currentWeekStart, end: weekEnd }));
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return weeks;
  }

  render() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const today = startOfDay(Date.now());

    if (this.enableScrolling) {
      return this.renderScrollingCalendar(weekStartsOn, today);
    } else {
      return this.renderStaticCalendar(weekStartsOn, today);
    }
  }

  private renderStaticCalendar(weekStartsOn: Day, today: Date) {
    const start = startOfWeek(today, { weekStartsOn });
    const end = addDays(start, 7 * (this.numWeeks ?? 4) - 1);
    const interval = eachDayOfInterval({ start, end });

    const adjustedDaysOfWeek = [
      ...DAYS_OF_WEEK.slice(weekStartsOn),
      ...DAYS_OF_WEEK.slice(0, weekStartsOn),
    ];

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="calendar">
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
          ${interval.map((date, index) => {
            const events = this.getEventsForDay(date);
            const forecast = this.weatherForecast?.get(getDayOfYear(date));

            return html`<div class="day">
              ${this.renderForecast(forecast)}
              <div class="date ${classMap({ past: isPast(endOfDay(date)) })}">
                ${index === 0 || date.getDate() === 1
                  ? html`<div class="month">${format(date, "MMM")}</div>`
                  : nothing}
                <div class="numeral ${classMap({ today: isToday(date) })}">${date.getDate()}</div>
              </div>
              ${events.map((event) => this.renderEvent(event, date))}
            </div>`;
          })}
        </div>
        ${this.renderEventDialog()}
      </ha-card>
    `;
  }

  private renderScrollingCalendar(weekStartsOn: Day, today: Date) {
    const monthsToRender = this.calculateMonthsToRender();
    const adjustedDaysOfWeek = [
      ...DAYS_OF_WEEK.slice(weekStartsOn),
      ...DAYS_OF_WEEK.slice(0, weekStartsOn),
    ];

    // Generate all weeks in a continuous sequence without duplicates
    const allWeeks = this.generateContinuousWeeks(monthsToRender, weekStartsOn);

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="calendar-container">
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
          <div 
            class="calendar-scroll-area" 
            @scroll=${this.handleScroll}
            .ref=${this.setScrollContainer}
          >
            <div class="calendar-content">
              <div class="calendar">
                ${allWeeks.map((week, weekIndex) => {
                  return html`
                    <div class="week">
                      ${week.map((date, dayIndex) => {
                        const events = this.getEventsForDay(date);
                        const forecast = this.weatherForecast?.get(getDayOfYear(date));

                        return html`<div class="day">
                          ${this.renderForecast(forecast)}
                          <div class="date ${classMap({ past: isPast(endOfDay(date)) })}">
                            ${(weekIndex === 0 && dayIndex === 0) || date.getDate() === 1
                              ? html`<div class="month">${format(date, "MMM")}</div>`
                              : nothing}
                            <div class="numeral ${classMap({ today: isToday(date) })}">
                              ${date.getDate()}
                            </div>
                          </div>
                          ${events.map((event) => this.renderEvent(event, date))}
                        </div>`;
                      })}
                    </div>
                  `;
                })}
              </div>
            </div>
          </div>
        </div>
        ${this.renderEventDialog()}
      </ha-card>
    `;
  }

  renderEvent(event: CalendarEvent, date: Date) {
    let content = event.title;
    if (!event.allDay) {
      const formatTokens = event.start.getMinutes() === 0 ? "haaaaa" : "h:mmaaaaa";
      content = `${format(event.start, formatTokens)} • ${event.title}`;
    }
    const color = `var(--color-${event.color ?? "blue"})`;
    const styles = {
      backgroundColor: event.allDay ? color : undefined,
      color: !event.allDay ? color : "#000",
    };
    const classes = {
      event: true,
      "all-day": event.allDay,
      past: event.allDay ? isPast(endOfDay(date)) : isPast(event.end),
    };
    const onClick = () => {
      this.selectedEvent = event;
    };
    return html`<button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
      ${content}
    </button>`;
  }

  static get styles() {
    return [
      super.sharedStyles,
      css`
        .week {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: min-content;
          grid-column: 1 / span 7;
          scroll-snap-align: start;
        }

        .event {
          font-size: 0.5em;
          line-height: 120%;
          margin: 4px 0;
          text-align: left;
          cursor: pointer;
          /* reset button styles */
          font-family: var(--mdc-typography-font-family);
          border: none;
          background: none;
          width: 100%;
          -webkit-font-smoothing: inherit;
          -moz-osx-font-smoothing: inherit;
          -webkit-appearance: none;
        }

        .event.all-day {
          color: #000;
          padding: 2px 6px;
          background-color: #bad455;
          border-radius: 4px;

          box-sizing: border-box;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-basic-calendar": PebbleBasicCalendar;
  }
}
