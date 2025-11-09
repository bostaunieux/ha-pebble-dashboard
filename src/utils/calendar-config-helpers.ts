import { Day } from "date-fns";
import {
  CalendarCardConfig,
  ResolvedMonthViewConfig,
  ResolvedWeekViewConfig,
  ResolvedAgendaViewConfig,
} from "../cards/calendar-types";

export function getWeekStart(config: CalendarCardConfig, viewType: "month" | "week"): Day {
  if (viewType === "month") {
    return +(config.month_view?.week_start ?? "0") as Day;
  }
  return +(config.week_view?.week_start ?? "0") as Day;
}

export function getEventsSpanDays(config: CalendarCardConfig, viewType: "month" | "week"): boolean {
  if (viewType === "month") {
    return config.month_view?.events_span_days ?? false;
  }
  return config.week_view?.events_span_days ?? false;
}

export function getResolvedMonthViewConfig(config: CalendarCardConfig): ResolvedMonthViewConfig {
  return {
    week_start: getWeekStart(config, "month"),
    events_span_days: getEventsSpanDays(config, "month"),
    num_weeks: config.month_view?.num_weeks ?? 12,
    month_calendar_start: config.month_view?.month_calendar_start ?? "current_week",
  };
}

export function getResolvedWeekViewConfig(config: CalendarCardConfig): ResolvedWeekViewConfig {
  return {
    week_start: getWeekStart(config, "week"),
    events_span_days: getEventsSpanDays(config, "week"),
    week_calendar_view: config.week_view?.week_calendar_view ?? "current_week",
  };
}

export function getResolvedAgendaViewConfig(config: CalendarCardConfig): ResolvedAgendaViewConfig {
  return {
    week_start: +(config.agenda_view?.week_start ?? "0") as Day,
  };
}
