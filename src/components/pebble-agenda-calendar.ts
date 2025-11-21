import { html, css, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, state } from "lit/decorators.js";
import "./pebble-calendar-month-header";
import {
  format,
  startOfDay,
  Day,
  addDays,
  isSameDay,
  isWithinInterval,
  startOfWeek,
  eachDayOfInterval,
  isSameWeek,
  isPast,
} from "date-fns";
import { CalendarEvent } from "../utils/calendar-utils";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

@customElement("pebble-agenda-calendar")
class PebbleAgendaCalendar extends PebbleBaseCalendar {
  @property({ attribute: false }) protected weekStartsOn: Day = 0;

  @state() private currentDate = startOfDay(Date.now());
  @state() private currentTime = new Date();

  private timeUpdateInterval?: number;

  connectedCallback() {
    super.connectedCallback();
    this.startCurrentTimeTracking();
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

      // If the day has changed, update currentDate to keep showing current week
      if (!isSameDay(oldDay, newDay)) {
        const weekDays = this.generateWeekDays();
        const wasShowingToday = weekDays.some((day) => isSameDay(day, oldDay));

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

  private generateWeekDays() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const start = startOfWeek(this.currentDate, { weekStartsOn });
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end });
  }

  private generateNextWeekRange() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const currentWeekStart = startOfWeek(this.currentDate, { weekStartsOn });
    const nextWeekStart = addDays(currentWeekStart, 7);
    const nextWeekEnd = addDays(nextWeekStart, 6);
    return { start: nextWeekStart, end: nextWeekEnd };
  }

  private getEventsForNextWeek() {
    const { start, end } = this.generateNextWeekRange();
    const weekInterval = { start, end };

    return this.events
      .filter(
        (event) =>
          isWithinInterval(event.start, weekInterval) ||
          isWithinInterval(event.end, weekInterval) ||
          (event.start <= start && event.end >= end),
      )
      .sort((a, b) => {
        // Sort by start date (oldest first)
        const dateDiff = a.start.getTime() - b.start.getTime();
        if (dateDiff !== 0) return dateDiff;
        // Within same start date, all day before not all day
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        // Otherwise (same start, both allDay or both not), tie-breaker on end date
        return a.end.getTime() - b.end.getTime();
      });
  }

  private handleCalendarNavigated = (event: CustomEvent) => {
    const type = event.detail.type;
    if (type === "prev") {
      this.navigateWeek(addDays(this.currentDate, -7));
    } else if (type === "next") {
      this.navigateWeek(addDays(this.currentDate, 7));
    } else if (type === "today") {
      this.navigateWeek(startOfDay(Date.now()));
    }
  }

  private navigateWeek(targetDate: Date) {
    this.currentDate = targetDate;

    this.dispatchEvent(
      new CustomEvent("date-range-changed", {
        detail: {
          currentDate: this.currentDate,
        },
      }),
    );
  }

  private isCurrentWeek(): boolean {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const weekStart = startOfWeek(this.currentDate, { weekStartsOn });
    const currentWeekStart = startOfWeek(this.currentTime, { weekStartsOn });
    return isSameWeek(weekStart, currentWeekStart, { weekStartsOn });
  }

  private isCurrentDay(date: Date): boolean {
    return isSameDay(date, this.currentTime);
  }

  render() {
    const weekDays = this.generateWeekDays();
    const nextWeekEvents = this.getEventsForNextWeek();

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    const monthName = format(this.isCurrentWeek() ? this.currentDate : weekDays[1], "MMMM u");

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="agenda-calendar">
          <pebble-calendar-month-header
            .localize=${this.localize}
            .monthName=${monthName}
            .disabled=${false}
            @calendar-navigated=${this.handleCalendarNavigated}
          ></pebble-calendar-month-header>

          <div class="day-cards-grid">
            ${weekDays.map((date) => this.renderDayCard(date))}
            ${this.renderNextWeekCard(nextWeekEvents)}
          </div>
        </div>
        ${this.renderEventDialog()}
      </ha-card>
    `;
  }

  private renderDayCard(date: Date) {
    const dayEvents = this.getEventsForDay(date);
    const isCurrentDay = this.isCurrentDay(date);

    const classes = {
      "day-card": true,
      "current-day": isCurrentDay,
    };

    return html`
      <div class=${classMap(classes)}>
        <div class="day-card-header">
          <div class="day-name">${format(date, "EEEE")}</div>
          <div class="day-date">${format(date, "MMM d")}</div>
          ${dayEvents.length > 0
            ? html`<div class="event-count">${dayEvents.length}</div>`
            : nothing}
        </div>
        <div class="day-card-events">
          ${dayEvents.length > 0
            ? dayEvents.map((event) => this.renderAgendaEvent(event, false, date))
            : html`<div class="no-events">
                ${this.localize("calendar.card.calendar.no-events")}
              </div>`}
        </div>
      </div>
    `;
  }

  private renderNextWeekCard(events: CalendarEvent[]) {
    return html`
      <div class="day-card next-week-card">
        <div class="day-card-header">
          <div class="day-name">${this.localize("calendar.card.agenda.next-week")}</div>
          ${events.length > 0 ? html`<div class="event-count">${events.length}</div>` : nothing}
        </div>
        <div class="day-card-events">
          ${events.length > 0
            ? events.map((event) => this.renderAgendaEvent(event, true))
            : html`<div class="no-events">
                ${this.localize("calendar.card.calendar.no-events")}
              </div>`}
        </div>
      </div>
    `;
  }

  private renderAgendaEvent(event: CalendarEvent, showDate: boolean = false, contextDate?: Date) {
    const color = `var(--color-${event.color ?? "blue"})`;
    const onClick = () => {
      this.selectedEvent = event;
    };

    // For all-day events with a context date, check if the context date is in the past
    // For other events or when no context date, check if the event's end has passed
    const isPastEvent =
      event.allDay && contextDate ? isPast(startOfDay(addDays(contextDate, 1))) : isPast(event.end);

    const classes = {
      "agenda-event": true,
      "all-day": event.allDay,
      past: isPastEvent,
    };

    const styles = {
      "--event-color": color,
    };

    let timeDisplay = "";
    if (event.allDay) {
      timeDisplay = this.localize("calendar.card.calendar.detail.all-day");
    } else {
      const startHour = event.start.getHours();
      const startMinute = event.start.getMinutes();
      const endHour = event.end.getHours();
      const endMinute = event.end.getMinutes();

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
      endFormatStr += "a";

      const startStr = format(event.start, startFormatStr);
      const endStr = format(event.end, endFormatStr);
      timeDisplay = `${startStr} - ${endStr}`;
    }

    return html`
      <button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
        <div class="event-title">${event.title}</div>
        <div class="event-time">
          ${showDate ? html`${format(event.start, "MMM d")} · ` : nothing}${timeDisplay}
        </div>
      </button>
    `;
  }

  static get styles() {
    return [
      super.baseStyles,
      css`
        .agenda-calendar {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .day-cards-grid {
          --grid-height: calc(
            100vh - var(--header-height, 0px) - var(--month-header-height) - var(--card-padding) -
              32px
          );
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 12px;
          flex: 1;
          padding: 16px 0;
          min-height: var(--grid-height);
          max-height: var(--grid-height);
          overflow: hidden;
        }

        .day-card {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
          background: var(--card-background-color, #fff);
          min-height: 0;
        }

        .day-card.current-day {
          border: 2px solid var(--dark-primary-color, #666);
          box-shadow: 0 0 8px rgba(3, 169, 244, 0.3);
        }

        .day-card.current-day .day-card-header {
          background: var(--dark-primary-color, #666);
        }

        .day-card.next-week-card .day-card-header {
          color: white;
        }

        .day-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--divider-color, #e0e0e0);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          flex-shrink: 0;
        }

        .day-name {
          font-size: 1.2em;
          font-weight: bold;
          flex: 1;
        }

        .day-date {
          font-size: 1.2em;
          font-weight: bold;
        }

        .event-count {
          background: rgb(68, 68, 68);
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 0.85em;
          font-weight: bold;
          min-width: 24px;
          text-align: center;
        }

        .day-card.current-day .event-count,
        .day-card.next-week-card .event-count {
          background: white;
          color: #000;
        }

        .day-card-events {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }

        .day-card-events::-webkit-scrollbar {
          width: 6px;
        }

        .day-card-events::-webkit-scrollbar-track {
          background: transparent;
        }

        .day-card-events::-webkit-scrollbar-thumb {
          background-color: var(--divider-color, #e0e0e0);
          border-radius: 3px;
        }

        .day-card-events::-webkit-scrollbar-thumb:hover {
          background-color: var(--secondary-text-color, #666);
        }

        .no-events {
          text-align: center;
          color: var(--secondary-text-color, #666);
          font-style: italic;
          padding: 20px 0;
        }

        .agenda-event {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 12px 12px 16px;
          background: var(--event-color);
          background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7));
          border-radius: 4px;
          cursor: pointer;
          border: none;
          font-family: var(--mdc-typography-font-family);
          text-align: left;
          width: 100%;
          box-sizing: border-box;
          transition: transform 0.1s ease;
          color: hsl(from var(--event-color) h s calc(l + 15));
          position: relative;
          gap: 4px 8px;
        }

        .agenda-event:hover {
          transform: translateX(2px);
        }

        .agenda-event:not(.all-day)::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 4px;
          bottom: 4px;
          width: 4px;
          background-color: hsl(from var(--event-color) h s calc(l + 15));
        }

        .agenda-event.past {
          opacity: 0.6;
        }

        .agenda-event.past::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.2);
          pointer-events: none;
          border-radius: 4px;
        }

        .agenda-event.all-day {
          background-image: none;
          color: #000;
          font-weight: bold;
          flex-direction: row;
          align-items: baseline;
        }

        .event-title {
          font-size: 1.2em;
          font-weight: bold;
          line-height: 120%;
          word-break: break-word;
        }

        .event-time {
          font-size: 0.95em;
          opacity: 0.9;
          line-height: 1.2;
        }

        :host {
          --mdc-icon-size: 28px;
          --mdc-icon-button-size: 44px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-agenda-calendar": PebbleAgendaCalendar;
  }
}
