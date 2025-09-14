import { CardTextOptions } from "./card-options";

export type CalendarEntity = { entity: string; color?: string };

export type CalendarCardConfig = {
  type: "custom:pebble-calendar-card";
  calendars?: Array<CalendarEntity>;
  week_start: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  events_span_days?: boolean;
  event_refresh_interval?: number;
  enable_weather?: boolean;
  weather_entity?: string;
  total_months?: number;
  start_position?: "current_week" | "start_of_month";
} & CardTextOptions;
