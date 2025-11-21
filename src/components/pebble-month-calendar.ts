import { css, CSSResultGroup } from "lit";
import { property, query, state } from "lit/decorators.js";
import { 
  Day, 
  startOfWeek, 
  startOfMonth, 
  addDays, 
  eachDayOfInterval, 
  format,
  subMonths,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameDay
} from "date-fns";
import { COLOR_CSS_VARS } from "../utils/colors";
import { PebbleBaseCalendar } from "./pebble-base-calendar";

export abstract class PebbleMonthCalendar extends PebbleBaseCalendar {
  @property({ attribute: false }) protected weekStartsOn: Day;

  @property({ attribute: false }) protected numWeeks?: number;

  @property({ attribute: false }) protected monthCalendarStart?: "current_week" | "start_of_month";

  @property({ attribute: false }) protected focusMonth: Date = startOfMonth(new Date());

  @property({ attribute: false }) protected onMonthChange?: (date: Date) => void;

  @state() protected displayedMonth: string = "";

  @state() protected isInitialRender = true;

  @query(".calendar-scroll-area") protected scrollArea?: HTMLDivElement;
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    super();
    this.displayedMonth = format(new Date(), "MMMM yyyy");
    this.weekStartsOn = 0;
    this.numWeeks = 12;
    this.monthCalendarStart = "current_week";
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupScrollTracking();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    super.updated(changedProperties);
    
    // On initial render, wait for events before scrolling
    if (this.isInitialRender && changedProperties.has("events") && this.events.length > 0) {
      this.updateComplete.then(() => {
        requestAnimationFrame(() => {
          this.scrollToInitialPosition();
          this.isInitialRender = false;
        });
      });
    }
  }

  protected setupScrollTracking() {
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (!this.scrollArea) {
        return;
      }

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          // Collect all intersecting weeks at the top
          const visibleWeeks: Array<{ weekIndex: number; monthName: string }> = [];
          
          entries.forEach((entry) => {
            if (entry.isIntersecting ) {
              const weekElement = entry.target as HTMLElement;
              const weekIndex = parseInt(weekElement.dataset.weekIndex || "0", 10);
              const monthName = weekElement.dataset.monthName || "";
              if (monthName) {
                visibleWeeks.push({ weekIndex, monthName });
              }
            }
          });

          if (visibleWeeks.length === 0) {
            return;
          }

          // check if any weeks from the currently displayed month are still visible
          if (visibleWeeks.some(week => week.monthName === this.displayedMonth)) {
            return;
          }

          // no weeks from current month visible - switch to the first visible week's month name
          const firstVisibleWeek = visibleWeeks.sort((a, b) => a.weekIndex - b.weekIndex)[0];
          if (this.displayedMonth !== firstVisibleWeek.monthName) {
            this.displayedMonth = firstVisibleWeek.monthName;
          }
        },
        {
          root: this.scrollArea,
          rootMargin: "0px 0px -99% 0px", // only monitor top 1% of the scrollable container
          threshold: 0.01,
        }
      );

      // observe all week elements
      const weekElements = this.scrollArea.querySelectorAll(".week");
      weekElements.forEach((week) => this.intersectionObserver?.observe(week));

      // set initial month from the first week element
      const firstWeek = this.scrollArea.querySelector<HTMLElement>(".week");
      if (firstWeek?.dataset.monthName) {
        this.displayedMonth = firstWeek.dataset.monthName;
      }
    });
  }

  protected handleNavigatePrev = () => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    
    // Can't navigate before current month
    if (this.focusMonth <= currentMonthStart) {
      return;
    }
    
    // Navigate to previous month
    this.navigateToMonth(subMonths(this.focusMonth, 1));
  };

  protected handleNavigateNext = () => {
    const nextMonth = addMonths(this.focusMonth, 1);
    this.navigateToMonth(nextMonth);
  };

  protected handleNavigateToday = () => {
    const today = new Date();
    this.navigateToMonth(startOfMonth(today));
  };

  private navigateToMonth(targetMonth: Date) {
    this.focusMonth = startOfMonth(targetMonth);
    
    // Notify parent to refetch events (async, don't wait)
    if (this.onMonthChange) {
      this.onMonthChange(this.focusMonth);
    }
    
    // Scroll will happen in updated() lifecycle
  }

  private scrollToInitialPosition() {
    if (!this.scrollArea) return;
    
    const today = new Date();
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    const startPosition = this.monthCalendarStart ?? "current_week";
    
    if (startPosition === "start_of_month") {
      // Scroll to day 1 of focus month (instant)
      this.scrollToMonth(this.focusMonth, "auto");
    } else {
      // Scroll to current week (instant)
      const currentWeekStart = startOfWeek(today, { weekStartsOn });
      this.scrollToWeek(currentWeekStart);
    }
  }

  private scrollToMonth(targetDate: Date, behavior: ScrollBehavior = "smooth") {
    if (!this.scrollArea) return;
    
    const targetMonthStr = format(targetDate, "MMMM yyyy");
    const weekElements = Array.from(this.scrollArea.querySelectorAll<HTMLElement>(".week"));
    
    for (const weekElement of weekElements) {
      if (weekElement.dataset.monthName === targetMonthStr) {
        // Calculate scroll position using getBoundingClientRect for accuracy
        const scrollAreaRect = this.scrollArea.getBoundingClientRect();
        const weekRect = weekElement.getBoundingClientRect();
        const scrollTop = this.scrollArea.scrollTop + (weekRect.top - scrollAreaRect.top);
        
        if (behavior === "smooth") {
          this.scrollArea.scrollTo({ top: scrollTop, behavior: "smooth" });
        } else {
          this.scrollArea.scrollTop = scrollTop;
        }
        break;
      }
    }
  }

  private scrollToWeek(targetWeekStart: Date) {
    if (!this.scrollArea) return;
    
    const weekElements = Array.from(this.scrollArea.querySelectorAll<HTMLElement>(".week"));
    const allWeeks = this.generateWeeksInMonth();
    
    // Find week containing target date
    for (let i = 0; i < allWeeks.length; i++) {
      const week = allWeeks[i];
      if (week.some(day => isSameDay(day, targetWeekStart))) {
        const weekElement = weekElements[i];
        if (weekElement) {
          // Calculate scroll position using getBoundingClientRect for accuracy
          const scrollAreaRect = this.scrollArea.getBoundingClientRect();
          const weekRect = weekElement.getBoundingClientRect();
          const scrollTop = this.scrollArea.scrollTop + (weekRect.top - scrollAreaRect.top);
          
          this.scrollArea.scrollTop = scrollTop;
        }
        break;
      }
    }
  }

  protected generateWeeksInMonth() {
    const weekStartsOn = +(this.weekStartsOn ?? 0) as Day;
    
    const nextMonth = addMonths(this.focusMonth, 2);
    
    // Start from beginning of previous month
    const rangeStart = startOfWeek(startOfMonth(this.focusMonth), { weekStartsOn });
    
    // End at end of next month
    const rangeEnd = endOfWeek(endOfMonth(nextMonth), { weekStartsOn });
    
    // Generate all weeks in this range
    const weeks = [];
    let currentWeekStart = rangeStart;
    
    while (currentWeekStart <= rangeEnd) {
      const weekEnd = addDays(currentWeekStart, 6);
      weeks.push(eachDayOfInterval({ start: currentWeekStart, end: weekEnd }));
      currentWeekStart = addDays(currentWeekStart, 7);
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
          display: flex;
          flex-direction: column;
        }
        .calendar {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: min-content;
          padding: 0 12px;
          overflow: visible;
        }

        .calendar-container {
          height: 100%;
          width: 100%;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        pebble-calendar-month-header {
          flex-shrink: 0;
        }

        .calendar-scroll-area {
          height: min(100%, calc(100vh - var(--header-height)));
          overflow-y: scroll;
          overflow-x: hidden;
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
          transition: filter 0.3s ease, opacity 0.3s ease;
        }

        .numeral {
          display: inline-block;
          padding: 10px;
          border-radius: 100px;
          min-width: 1.25em;
          text-align: center;

          transition: filter 0.3s ease, opacity 0.3s ease;
        }

        .numeral.today {
          background-color: rgb(68, 68, 68);
          padding: 10px;
        }

        /* Loading state - obfuscate day numbers */
        .date.loading .numeral,
        .date.loading .month {
          filter: blur(4px);
          opacity: 0.3;
          user-select: none;
          pointer-events: none;
        }
      `,
    ];
  }
}
