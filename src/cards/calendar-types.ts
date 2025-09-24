import { CardTextOptions } from "./card-options";

export type CalendarEntity = { entity: string; color?: string };

export type CalendarCardConfig = {
  type: "custom:pebble-calendar-card";
  calendars?: Array<CalendarEntity>;
  num_weeks?: number;
  week_start: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  month_calendar_start?: "current_week" | "start_of_month";
  events_span_days?: boolean;
  event_refresh_interval?: number;
  enable_weather?: boolean;
  weather_entity?: string;
  view_type?: "month" | "week";
  week_days?: 5 | 7;
} & CardTextOptions;
