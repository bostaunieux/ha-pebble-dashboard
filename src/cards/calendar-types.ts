import { CardTextOptions } from "./card-options";

export type CalendarEntity = { entity: string; color?: string };

export interface MonthViewConfig {
  week_start?: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  events_span_days?: boolean;
  num_weeks?: number;
  month_calendar_start?: "current_week" | "start_of_month";
}

export interface WeekViewConfig {
  week_start?: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  events_span_days?: boolean;
  week_calendar_view?: "current_week" | "next_5_days" | "next_7_days";
}

export interface ResolvedMonthViewConfig {
  week_start: number; // Day from date-fns
  events_span_days: boolean;
  num_weeks: number;
  month_calendar_start: "current_week" | "start_of_month";
}

export interface ResolvedWeekViewConfig {
  week_start: number; // Day from date-fns
  events_span_days: boolean;
  week_calendar_view: "current_week" | "next_5_days" | "next_7_days";
}

export type CalendarCardConfig = {
  type: "custom:pebble-calendar-card";
  calendars?: Array<CalendarEntity>;
  show_view_toggle?: boolean;
  view_type?: "month" | "week";
  event_refresh_interval?: number;
  enable_weather?: boolean;
  weather_entity?: string;

  // Global fallbacks (for backward compatibility)
  num_weeks?: number;
  month_calendar_start?: "current_week" | "start_of_month";
  week_calendar_view?: "current_week" | "next_5_days" | "next_7_days";

  // View-specific overrides
  month_view?: MonthViewConfig;
  week_view?: WeekViewConfig;
} & CardTextOptions;
