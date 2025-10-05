import {
  differenceInCalendarDays,
  endOfDay,
  parseISO,
  startOfDay,
  subDays,
  max,
  min,
  eachDayOfInterval,
  getHours,
  getMinutes,
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
export interface TimedEventPosition {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
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
  const totalMinutes = minutesTillNext * 60;
  const totalSeconds = totalMinutes - seconds;

  return totalSeconds * 1_000 - milliseconds;
};

export const getEventsByWeekdays = (
  events: ReadonlyArray<CalendarEvent>,
  weekStart: Date,
  weekEnd: Date,
) => {
  // Generate all days in the interval using date-fns
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Initialize an array with the correct number of empty arrays
  const weekdays: Array<Array<CalendarEvent>> = Array.from({ length: days.length }, () => []);

  // Create a map of dates to their indices in the displayed range
  const dateToIndex = new Map<string, number>();
  days.forEach((day, index) => {
    dateToIndex.set(day.toDateString(), index);
  });

  // Function to get the day index from a date
  function getDayIndex(date: Date): number | null {
    return dateToIndex.get(date.toDateString()) ?? null;
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

    // Skip if the event doesn't fall within our displayed range
    if (startDayIndex === null || endDayIndex === null) {
      return;
    }

    // Find the starting position for the event on its first day
    const startPos = findNextAvailablePosition(weekdays[startDayIndex]);

    let currentDayIndex = startDayIndex;
    // Add event to each relevant day
    while (currentDayIndex <= endDayIndex && currentDayIndex < days.length) {
      weekdays[currentDayIndex][startPos] = event;
      currentDayIndex++;
    }
  });

  return weekdays;
};

/**
 * Calculates the position and dimensions of an event within a calendar day view.
 * Handles overlapping events by distributing them efficiently across available space.
 */
export const getEventPosition = (
  event: CalendarEvent,
  allEventsForDay: CalendarEvent[],
): TimedEventPosition => {
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

  const eventStart = event.start;
  const eventEnd = event.end;

  // Convert to minutes from start of day
  const startMinutes = getHours(eventStart) * 60 + getMinutes(eventStart);
  const endMinutes = getHours(eventEnd) * 60 + getMinutes(eventEnd);

  // Calculate position (each hour = 60px, so each minute = 1px)
  const top = startMinutes;
  const height = endMinutes - startMinutes;

  // Get all non-all-day events for the day
  const timeEvents = allEventsForDay.filter((e) => !e.allDay);

  // Find the position of this event within its overlap group
  const position = getEventPositionInOverlapGroup(event, timeEvents);

  // Find the maximum number of simultaneous overlapping events for this specific event
  const maxOverlaps = getMaxSimultaneousOverlaps(event, timeEvents);

  const width = 100 / maxOverlaps;
  const left = position * width;

  return {
    event,
    top,
    height,
    left,
    width,
    zIndex: 2,
  };
};

/**
 * Calculates the maximum number of simultaneous overlapping events for a given target event.
 */
const getMaxSimultaneousOverlaps = (
  targetEvent: CalendarEvent,
  allEvents: CalendarEvent[],
): number => {
  // Find all events that overlap with the target event
  const overlappingEvents = allEvents.filter(
    (e) => e !== targetEvent && e.start < targetEvent.end && e.end > targetEvent.start,
  );

  if (overlappingEvents.length === 0) {
    return 1;
  }

  // Create time points for all overlapping events (including target)
  const timePoints: Array<{ time: Date; type: "start" | "end"; event: CalendarEvent }> = [];

  // Add target event
  timePoints.push({ time: targetEvent.start, type: "start", event: targetEvent });
  timePoints.push({ time: targetEvent.end, type: "end", event: targetEvent });

  // Add overlapping events
  for (const event of overlappingEvents) {
    timePoints.push({ time: event.start, type: "start", event });
    timePoints.push({ time: event.end, type: "end", event });
  }

  // Sort by time
  timePoints.sort((a, b) => a.time.getTime() - b.time.getTime());

  let maxOverlaps = 0;
  let currentOverlaps = 0;

  const activeEvents = new Set<CalendarEvent>();

  for (const point of timePoints) {
    if (point.type === "start") {
      activeEvents.add(point.event);
      currentOverlaps = activeEvents.size;
      maxOverlaps = Math.max(maxOverlaps, currentOverlaps);
    } else {
      activeEvents.delete(point.event);
      currentOverlaps = activeEvents.size;
    }
  }

  return maxOverlaps;
};

/**
 * Determines the position of an event within its overlap group using a greedy algorithm.
 * This function calculates positions globally for all events to ensure consistency.
 */
const getEventPositionInOverlapGroup = (
  targetEvent: CalendarEvent,
  allEvents: CalendarEvent[],
): number => {
  // Calculate positions for all events globally
  const globalPositions = calculateGlobalEventPositions(allEvents);
  return globalPositions.get(targetEvent) || 0;
};

/**
 * Calculates positions for all events globally using a greedy algorithm.
 * This ensures consistent positioning across all events.
 */
const calculateGlobalEventPositions = (allEvents: CalendarEvent[]): Map<CalendarEvent, number> => {
  const positions: Map<CalendarEvent, number> = new Map();

  // Sort events by start time for consistent processing order
  const sortedEvents = [...allEvents].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const event of sortedEvents) {
    // Find the first available position for this event
    let position = 0;
    while (true) {
      // Check if this position conflicts with any already placed events
      const conflicts = sortedEvents.some((placedEvent) => {
        const placedPosition = positions.get(placedEvent);
        if (placedPosition === undefined || placedPosition !== position) {
          return false;
        }
        // Check if events overlap in time
        return placedEvent.start < event.end && placedEvent.end > event.start;
      });

      if (!conflicts) {
        break;
      }
      position++;
    }

    positions.set(event, position);
  }

  return positions;
};
