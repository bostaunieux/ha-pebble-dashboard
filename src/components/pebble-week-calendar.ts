import { html, css } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, query, state } from "lit/decorators.js";
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
  endOfWeek,
  isSameWeek,
  isPast,
  differenceInDays,
} from "date-fns";
import { CalendarEvent, getEventsByWeekdays } from "../utils/calendar-utils";
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
  @property({ attribute: false }) protected eventsSpanDays: boolean = false;

  @state() private currentDate = startOfDay(Date.now());
  @state() private currentTime = new Date();

  @query(".time-grid-container") private timeGridContainer?: HTMLDivElement;

  private timeUpdateInterval?: number;
  private inactivityTimer?: number;
  private autoScrollInterval?: number;
  private scrollListener?: () => void;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.startCurrentTimeTracking();
    this.startInactivityTracking();

    setTimeout(() => {
      this.scrollToCurrentTime();
    }, 100);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopCurrentTimeTracking();
    this.stopInactivityTracking();
  }

  private startCurrentTimeTracking() {
    this.currentTime = new Date();
    this.timeUpdateInterval = window.setInterval(() => {
      this.currentTime = new Date();
    }, 60 * 1_000); // Update every minute
  }

  private stopCurrentTimeTracking() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = undefined;
    }
  }

  private startInactivityTracking() {
    this.resetInactivityTimer();
    
    // Add scroll listener and store reference for cleanup
    this.scrollListener = () => {
      this.recordUserInteraction();
    };
    this.timeGridContainer?.addEventListener('scroll', this.scrollListener);
  }

  private stopInactivityTracking() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = undefined;
    }
    if (this.scrollListener) {
      this.timeGridContainer?.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = undefined;
    }
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = undefined;
    }

    this.inactivityTimer = window.setTimeout(() => {
      this.startAutoScroll();
    }, 60 * 1_000); // 1 minute
  }


  private startAutoScroll() {
    if (this.autoScrollInterval) return; // Already running

    this.autoScrollInterval = window.setInterval(() => {
      if (this.isCurrentWeek()) {
        this.scrollToCurrentTime('smooth');
      }
    }, 60 * 60 * 1_000); // every hour
  }

  private recordUserInteraction() {
    this.resetInactivityTimer();
  }

  private isCurrentWeek(): boolean {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const weekStart = startOfWeek(this.currentDate, { weekStartsOn });
    const currentWeekStart = startOfWeek(this.currentTime, { weekStartsOn });
    return isSameWeek(weekStart, currentWeekStart, { weekStartsOn });
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

  private scrollToCurrentTime(behavior: 'smooth' | 'instant' = 'instant') {
    if (!this.isCurrentWeek()) return;
    
    const currentHour = this.getCurrentHour();
    const currentMinute = this.getCurrentMinute();
    
    const scrollPosition = (currentHour * 60 + currentMinute) * (60 / 60); // 60px per hour
    this.timeGridContainer?.scroll({
      top: Math.max(0, scrollPosition - 200),
      behavior,
    });
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

  private getEventsForWeek(weekStart: Date, weekEnd: Date) {
    const weekInterval = { start: weekStart, end: weekEnd };

    return this.events
      .filter((event) =>
        isWithinInterval(event.start, weekInterval) ||
        isWithinInterval(event.end, weekInterval) ||
        (event.start <= weekStart && event.end >= weekEnd)
      )
      .sort(
        (a, b) =>
          (a.allDay ? 0 : a.start.getHours() * 60 + a.start.getMinutes()) -
          (b.allDay ? 0 : b.start.getHours() * 60 + b.start.getMinutes()),
      );
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
    this.recordUserInteraction();
  }

  private navigatePrev = () => this.navigateWeek("prev");
  private navigateNext = () => this.navigateWeek("next");

  private organizeAllDayEventsIntoPositions(events: CalendarEvent[]): (CalendarEvent | null)[] {
    if (events.length === 0) return [];
    
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => {
      const diff = a.start.getTime() - b.start.getTime();
      if (diff === 0) {
        // for events with the same start date, put event with longer end dates first
        return b.end.getTime() - a.end.getTime();
      }
      return diff;
    });
    
    // Initialize array to hold events at specific positions
    const positions: (CalendarEvent | null)[] = [];
    
    sortedEvents.forEach(event => {
      // Find the next available position
      let position = 0;
      while (positions[position]) {
        position++;
      }
      positions[position] = event;
    });
    
    return positions;
  }

  render() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const weekDays = this.generateWeekDays();
    const adjustedDaysOfWeek = [
      ...DAYS_OF_WEEK.slice(weekStartsOn),
      ...DAYS_OF_WEEK.slice(0, weekStartsOn),
    ].slice(0, this.weekDays);

    // Get events organized by weekdays if spanning is enabled
    let weekEvents: Array<Array<CalendarEvent>> = [];
    if (this.eventsSpanDays) {
      const weekStart = startOfWeek(weekDays[0], { weekStartsOn });
      const weekEnd = endOfWeek(weekDays[weekDays.length - 1], { weekStartsOn });
      weekEvents = getEventsByWeekdays(
        this.getEventsForWeek(weekStart, weekEnd),
        weekStart,
        weekEnd,
        weekStartsOn,
      );
    }

    const textSize = this.textSize;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
      "--week-days": this.weekDays,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="week-calendar-container">
          <!-- Month header with navigation -->
          <div class="month-header">
            <div class="month-name">${format(weekDays[1], "MMMM u")}</div>
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
            <div class="time-labels-spacer"></div>
            ${weekDays.map((date, index) => {
              const dayName = adjustedDaysOfWeek[index];
              return html`
                <div class="wk-day-header ${classMap({ today: isToday(date) })}">
                  <div class="wk-day-name">
                    ${this.localize(`calendar.card.calendar.week-days.${dayName}`)}
                  </div>
                  <div class="wk-day-number">
                    ${date.getDate()}
                  </div>
                </div>
              `;
            })}
          </div>

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
              
              // Organize events into positions (like spanning calendar)
              const eventPositions = this.organizeAllDayEventsIntoPositions(allDayEvents);
              
              return html`
                <div class="all-day-column">
                  ${eventPositions.map((event) => 
                    event ? html`
                      <div>
                        ${this.eventsSpanDays 
                          ? this.renderSpanningAllDayEvent(event, date, weekStartsOn)
                          : this.renderAllDayEvent(event)
                        }
                      </div>
                    ` : html`<div></div>`
                  )}
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
                  <div class="time-label ${classMap({
                    'current-hour': this.isCurrentWeek() && hour === this.getCurrentHour()
                  })}">
                    <span class="text">${format(setHours(setMinutes(new Date(), 0), hour), "h")}

                      <span class="text-am-pm">${format(setHours(setMinutes(new Date(), 0), hour), "a")}</span>  
                    </span>  
                    
                  </div>
                `,
              )}
            </div>

              ${weekDays.map((date) => {
                const dayEvents = this.getEventsForDay(date).filter((e) => !e.allDay);
                const isCurrentDay = this.isCurrentDay(date);
                return html`
                  <div class="day-column ${classMap({
                    'current-day': isCurrentDay
                  })}">
                    ${HOURS.map((hour) => html`
                      <div class="hour-slot ${classMap({
                        'current-hour': this.isCurrentWeek() && hour === this.getCurrentHour()
                      })}"></div>
                    `)}
                    ${dayEvents.map((event) => {
                      const position = this.getEventPosition(event, dayEvents);
                      return this.renderTimedEvent(event, position);
                    })}
                    ${isCurrentDay && this.isCurrentWeek() ? html`
                      <div class="current-time-line" style=${styleMap({
                        top: `${(this.getCurrentHour() * 60 + this.getCurrentMinute()) * (60 / 60)}px`
                      })}></div>
                    ` : ''}
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

  renderSpanningAllDayEvent(event: CalendarEvent, date: Date, weekStartsOn: Day) {
    if (event == null) {
      return html`<span></span>`;
    }

    // Only render the event on its start day or if it's the first day of the week
    if (!isSameDay(event.start, date) && date.getDay() !== weekStartsOn) {
      return html`<span></span>`;
    }

    const content = event.title;
    let daysInterval = event.daysInterval;
    if (daysInterval > 1) {
      if (isSameDay(event.start, date)) {
        daysInterval = Math.min(this.weekDays - date.getDay() + weekStartsOn, daysInterval);
      } else {
        daysInterval = Math.min(this.weekDays, daysInterval - differenceInDays(date, event.start));
      }
    }

    const color = `var(--color-${event.color ?? "blue"})`;
    const styles = {
      backgroundColor: color,
      color: "#000",
      width:
        daysInterval <= 1
          ? undefined
          : `calc((${daysInterval} * 100%) + (${daysInterval - 1} * var(--day-margin) * 2))`,
    };

    const classes = {
      "all-day-event": true,
      "spanning-event": true,
      begin: isSameDay(event.start, date),
      end: isSameWeek(event.end, date, { weekStartsOn }),
      past: isPast(event.end),
    };

    const onClick = () => {
      this.selectedEvent = event;
      this.recordUserInteraction();
    };

    return html`
      <button class=${classMap(classes)} style=${styleMap(styles)} @click=${onClick}>
        <span class="text">${content}</span>
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

        .month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 12px 16px;
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

        .time-labels-spacer {
          width: 60px;
          border-right: 1px solid var(--divider-color, #e0e0e0);
        }

        .day-headers {
          display: grid;
          grid-template-columns: 60px repeat(var(--week-days, 7), 1fr);
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
        }

        .wk-day-header {
          margin: var(--day-margin, 5px);
          padding-bottom: 4px;
          border-bottom: 2px solid #ccc;
          font-size: 1.75em;
          display: flex;
          gap: 8px;
          place-items: center;
          line-height: 120%;
        }

        .wk-day-header.today {
          border-bottom: 3px solid var(--primary-text-color);
        }

        .wk-day-header.today .wk-day-name {
          font-weight: bold;
        }

        .wk-day-number {
          display: inline-block;
          padding: 10px;
          border-radius: 100px;
          min-width: 1.25em;
          text-align: center;
        }

        .wk-day-header.today .wk-day-number {
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
          gap: 2px;
          display: grid;
          grid-template-rows: subgrid;
          grid-row: span 100;
          margin: var(--day-margin, 5px);
        }

        .all-day-event {
          font-size: 1em;
          padding: 2px 6px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          text-align: left;
          color: #000;
        }

        .all-day-event:not(.spanning-event) {
          width: 100%;
        }

        .all-day-event.spanning-event {
          position: relative;
          z-index: 1;
          box-sizing: border-box;
          white-space: nowrap;
          /* overflow: hidden; */
          text-overflow: ellipsis;
        }

        .all-day-event.spanning-event .text {
          /* line clamp */
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow-y: hidden;
          white-space: normal;
          word-break: break-all;
        }

        .all-day-event.spanning-event.begin {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
        }

        .all-day-event.spanning-event.end {
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
        }

        /* left arrow for spanning events */
        .all-day-event.spanning-event:not(.begin):before {
          content: "";
          display: block;
          width: 0;
          height: 0;
          clip-path: polygon(100% 0, 0 50%, 100% 100%);
          position: absolute;
          top: 0px;
          left: -11px;
          width: 12.5px; /* intentional extra half pixel to avoid gap */
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

        /* right arrow for spanning events */
        .all-day-event.spanning-event:not(.end):after {
          content: "";
          display: block;
          width: 0;
          height: 0;
          clip-path: polygon(0 0, 0 100%, 100% 50%);
          position: absolute;
          top: 0px;
          right: -11px;
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

        .time-grid-container {
          flex: 1;
          position: relative;
          overflow-y: auto;
          /* max-height: 70vh; */
          /* 84px = month header; 40px = all day events; 32px = calendar padding */
          max-height: calc(100vh - var(--header-height, 0) - 84px - 40px - 32px - 56px);
          min-height: 0;
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
          color: var(--secondary-text-color, #666);
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

        .time-label .text-am-pm {
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
          content: '';
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          background-color: var(--primary-color, #03a9f4);
          border-radius: 50%;
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
          --arrow-radius: 4px;
          --mdc-icon-button-size: 32px;
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
