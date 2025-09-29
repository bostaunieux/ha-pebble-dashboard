import { Day } from "date-fns";
import {
  CalendarCardConfig,
  ResolvedMonthViewConfig,
  ResolvedWeekViewConfig,
} from "../cards/calendar-types";

export function getWeekStart(config: CalendarCardConfig, viewType: "month" | "week"): Day {
  if (viewType === "month" && config.month_view?.week_start) {
    return +config.month_view.week_start as Day;
  }
  if (viewType === "week" && config.week_view?.week_start) {
    return +config.week_view.week_start as Day;
  }
  return +(config.week_start ?? "0") as Day;
}

export function getEventsSpanDays(config: CalendarCardConfig, viewType: "month" | "week"): boolean {
  if (viewType === "month" && config.month_view?.events_span_days !== undefined) {
    return config.month_view.events_span_days;
  }
  if (viewType === "week" && config.week_view?.events_span_days !== undefined) {
    return config.week_view.events_span_days;
  }
  return config.events_span_days ?? false;
}

export function getResolvedMonthViewConfig(config: CalendarCardConfig): ResolvedMonthViewConfig {
  return {
    week_start: getWeekStart(config, "month") as Day,
    events_span_days: getEventsSpanDays(config, "month"),
    num_weeks: config.month_view?.num_weeks ?? config.num_weeks ?? 12,
    month_calendar_start:
      config.month_view?.month_calendar_start ?? config.month_calendar_start ?? "current_week",
  };
}

export function getResolvedWeekViewConfig(config: CalendarCardConfig): ResolvedWeekViewConfig {
  return {
    week_start: getWeekStart(config, "week") as Day,
    events_span_days: getEventsSpanDays(config, "week"),
    week_calendar_view:
      config.week_view?.week_calendar_view ?? config.week_calendar_view ?? "current_week",
  };
}
