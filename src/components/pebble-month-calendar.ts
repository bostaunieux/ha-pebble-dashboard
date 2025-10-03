import { css, CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import { Day, startOfWeek, startOfMonth, addDays, eachDayOfInterval } from "date-fns";
import { COLOR_CSS_VARS } from "../utils/colors";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

export abstract class PebbleMonthCalendar extends PebbleBaseCalendar {
  @property({ attribute: false }) protected weekStartsOn: Day;

  @property({ attribute: false }) protected numWeeks?: number;

  @property({ attribute: false }) protected monthCalendarStart?: "current_week" | "start_of_month";

  constructor() {
    super();
    this.weekStartsOn = 0;
    this.numWeeks = 12;
    this.monthCalendarStart = "current_week";
  }

  protected generateWeeksInMonth() {
    const numWeeks = this.numWeeks ?? 12;
    const today = Date.now();
    const startPosition = this.monthCalendarStart ?? "current_week";
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

  static get monthStyles(): CSSResultGroup {
    return [
      COLOR_CSS_VARS,
      css`
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
          scrollbar-color: var(--divider-color, #e0e0e0) transparent;
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
      `,
    ];
  }
}
