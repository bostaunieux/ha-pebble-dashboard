import {
  Day,
  differenceInCalendarDays,
  endOfDay,
  parseISO,
  startOfDay,
  subDays,
  max,
  min,
} from "date-fns";
import type { HomeAssistant } from "../types";

export interface Calendar {
  entity_id: string;
  name?: string;
  backgroundColor?: string;
  color?: string;
}

/** Object used to render a calendar event in fullcalendar. */
export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  daysInterval: number;
  backgroundColor?: string;
  borderColor?: string;
  calendar: string;
  eventData: CalendarEventData;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/** Data returned from the core APIs. */
export interface CalendarEventData {
  uid?: string;
  recurrence_id?: string;
  summary: string;
  dtstart: string;
  dtend: string;
  rrule?: string;
  description?: string;
}

export const fetchCalendarEvents = async (
  hass: HomeAssistant,
  start: Date,
  end: Date,
  calendars: Calendar[],
): Promise<{ events: CalendarEvent[]; errors: string[] }> => {
  const params = encodeURI(`?start=${start.toISOString()}&end=${end.toISOString()}`);

  const calEvents: CalendarEvent[] = [];
  const errors: string[] = [];
  const promises: Promise<CalendarEvent[]>[] = [];

  calendars.forEach((cal) => {
    promises.push(hass.callApi<CalendarEvent[]>("GET", `calendars/${cal.entity_id}${params}`));
  });

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    const cal = calendars[index];
    if (result.status === "rejected") {
      errors.push(cal.entity_id);
      return;
    }

    const events = result.value;
    events.forEach((event) => {
      const eventStart = getCalendarDate(event.start);
      const eventEnd = getCalendarDate(event.end);
      if (!eventStart || !eventEnd) {
        return;
      }
      // all day event dates will have form '2023-10-31'
      const allDay = eventStart?.length === 10;
      const start = parseISO(eventStart);
      const end = parseISO(eventEnd);
      const calendarEvent: CalendarEvent = {
        start: allDay ? startOfDay(start) : start,
        end: allDay ? endOfDay(subDays(end, 1)) : end,
        title: event.summary,
        allDay,
        daysInterval: differenceInCalendarDays(end, start),
        calendar: cal.entity_id,
        color: cal.color,
        eventData: {
          uid: event.uid,
          summary: event.summary,
          description: event.description,
          dtstart: eventStart,
          dtend: eventEnd,
          recurrence_id: event.recurrence_id,
          rrule: event.rrule,
        },
      };

      calEvents.push(calendarEvent);
    });
  });

  return { events: calEvents, errors };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCalendarDate = (dateObj: any): string | undefined => {
  if (typeof dateObj === "string") {
    return dateObj;
  }

  if (dateObj.dateTime) {
    return dateObj.dateTime;
  }

  if (dateObj.date) {
    return dateObj.date;
  }

  return undefined;
};

export const getTimeUntilNextInterval = (intervalMinutes: number, now: Date = new Date()) => {
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  // For 1-minute intervals, we only need to calculate time until next minute
  if (intervalMinutes === 1) {
    return (60 - seconds) * 1_000 - milliseconds;
  }

  // For other intervals, calculate time until next interval block
  const minutesTillNext = intervalMinutes - (minutes % intervalMinutes);
  const totalMinutes = (minutesTillNext === intervalMinutes ? 0 : minutesTillNext) * 60;
  const totalSeconds = totalMinutes - seconds;

  return totalSeconds * 1_000 - milliseconds;
};

export const getEventsByWeekdays = (
  events: ReadonlyArray<CalendarEvent>,
  weekStart: Date,
  weekEnd: Date,
  weekStartsOn: Day,
) => {
  // Initialize an array with 7 empty arrays, one for each weekday
  const weekdays: Array<Array<CalendarEvent>> = [[], [], [], [], [], [], []];

  // Function to get the day index (0-6) from a date
  function getDayIndex(date: Date) {
    return (date.getDay() + (7 - weekStartsOn)) % 7;
  }

  // Helper function to find the next available position for an event on a given day
  function findNextAvailablePosition(dayEvents: CalendarEvent[]) {
    let position = 0;
    while (dayEvents[position]) {
      position++;
    }
    return position;
  }

  const sortedEvents = [...events].sort((a, b) => {
    // ensure events starting earlier are processed first
    const diff = a.start.getTime() - b.start.getTime();
    if (diff === 0) {
      // for events with the same start date, put event with longer end dates first
      return b.end.getTime() - a.end.getTime();
    }

    return diff;
  });

  sortedEvents.forEach((event) => {
    const startDate = max([event.start, weekStart]);
    const endDate = min([event.end, weekEnd]);
    // Calculate the starting and ending day indices
    const startDayIndex = getDayIndex(startDate);
    const endDayIndex = getDayIndex(endDate);

    // Find the starting position for the event on its first day
    const startPos = findNextAvailablePosition(weekdays[startDayIndex]);

    let currentDayIndex = startDayIndex;
    // Add event to each relevant day
    while (currentDayIndex <= endDayIndex && currentDayIndex < 7) {
      weekdays[currentDayIndex][startPos] = event;
      currentDayIndex++;
    }
  });

  return weekdays;
};
