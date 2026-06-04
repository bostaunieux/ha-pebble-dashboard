import {
  CalendarEvent,
  filterEventsInRange,
  getEventPosition,
  getNextWeekRange,
} from "../calendar-utils";

// Helper function to create a CalendarEvent for testing
const createEvent = (
  title: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  allDay: boolean = false,
): CalendarEvent => {
  const start = new Date(2025, 0, 1, startHour, startMinute);
  const end = new Date(2025, 0, 1, endHour, endMinute);

  return {
    title,
    start,
    end,
    daysInterval: 0,
    calendar: "test-calendar",
    eventData: {
      summary: title,
      dtstart: start.toISOString(),
      dtend: end.toISOString(),
    },
    allDay,
  };
};

describe("getEventPosition", () => {
  describe("Example 1: Three overlapping events", () => {
    const eventA = createEvent("Event A", 10, 0, 14, 0); // 10am - 2pm
    const eventB = createEvent("Event B", 11, 0, 11, 30); // 11am - 11:30am
    const eventC = createEvent("Event C", 13, 0, 13, 30); // 1pm - 1:30pm
    const allEvents = [eventA, eventB, eventC];

    test("Event A (10am-2pm) should have full width and 0% offset", () => {
      const position = getEventPosition(eventA, allEvents);

      expect(position.width).toBe(100); // Full width = 100%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(600); // 10am = 10 * 60 = 600 minutes
      expect(position.height).toBe(240); // 4 hours = 240 minutes
    });

    test("Event B (11am-11:30am) should have 50% width and 50% offset", () => {
      const position = getEventPosition(eventB, allEvents);

      expect(position.width).toBe(50); // 50% width (remaining space from 50% to 100%)
      expect(position.left).toBe(50); // 50% offset
      expect(position.top).toBe(660); // 11am = 11 * 60 = 660 minutes
      expect(position.height).toBe(30); // 30 minutes
    });

    test("Event C (1pm-1:30pm) should have 50% width and 50% offset", () => {
      const position = getEventPosition(eventC, allEvents);

      expect(position.width).toBe(50); // 50% width (remaining space from 50% to 100%)
      expect(position.left).toBe(50); // 50% offset
      expect(position.top).toBe(780); // 1pm = 13 * 60 = 780 minutes
      expect(position.height).toBe(30); // 30 minutes
    });
  });

  describe("Example 2: Three events with complex overlaps", () => {
    const eventA = createEvent("Event A", 10, 0, 11, 0); // 10am - 11am
    const eventB = createEvent("Event B", 10, 30, 11, 30); // 10:30am - 11:30am
    const eventC = createEvent("Event C", 11, 0, 12, 0); // 11am - 12pm
    const allEvents = [eventA, eventB, eventC];

    test("Event A (10am-11am) should have full width and 0% offset", () => {
      const position = getEventPosition(eventA, allEvents);

      expect(position.width).toBe(100); // Full width = 100%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(600); // 10am = 10 * 60 = 600 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });

    test("Event B (10:30am-11:30am) should have 50% width and 50% offset", () => {
      const position = getEventPosition(eventB, allEvents);

      expect(position.width).toBe(50); // 50% width (remaining space from 50% to 100%)
      expect(position.left).toBe(50); // 50% offset
      expect(position.top).toBe(630); // 10:30am = 10 * 60 + 30 = 630 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });

    test("Event C (11am-12pm) should have full width and 0% offset", () => {
      const position = getEventPosition(eventC, allEvents);

      expect(position.width).toBe(100); // Full width = 100%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(660); // 11am = 11 * 60 = 660 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });
  });

  describe("Width calculation examples", () => {
    test("Three overlapping events should demonstrate progressive width reduction", () => {
      const event1 = createEvent("Event 1", 10, 0, 12, 0); // 10am - 12pm
      const event2 = createEvent("Event 2", 10, 30, 11, 30); // 10:30am - 11:30am
      const event3 = createEvent("Event 3", 11, 0, 11, 30); // 11am - 11:30am
      const allEvents = [event1, event2, event3];

      const position1 = getEventPosition(event1, allEvents);
      const position2 = getEventPosition(event2, allEvents);
      const position3 = getEventPosition(event3, allEvents);

      // Event 1: position 0, should have full width (100%)
      expect(position1.left).toBe(0);
      expect(position1.width).toBe(100);

      // Event 2: position 1, should have 66.67% width (remaining space from 33.33% to 100%)
      expect(position2.left).toBeCloseTo(33.33, 1);
      expect(position2.width).toBeCloseTo(66.67, 1);

      // Event 3: position 2, should have 33.33% width (remaining space from 66.67% to 100%)
      expect(position3.left).toBeCloseTo(66.67, 1);
      expect(position3.width).toBeCloseTo(33.33, 1);
    });

    test("Four overlapping events should demonstrate 25% width for last event", () => {
      const event1 = createEvent("Event 1", 10, 0, 12, 0); // 10am - 12pm
      const event2 = createEvent("Event 2", 10, 15, 11, 45); // 10:15am - 11:45am
      const event3 = createEvent("Event 3", 10, 30, 11, 30); // 10:30am - 11:30am
      const event4 = createEvent("Event 4", 10, 45, 11, 15); // 10:45am - 11:15am
      const allEvents = [event1, event2, event3, event4];

      const position4 = getEventPosition(event4, allEvents);

      // Event 4: position 3, should have 25% width (remaining space from 75% to 100%)
      expect(position4.left).toBe(75);
      expect(position4.width).toBe(25);
    });

    test("zIndex should increase with left position", () => {
      const event1 = createEvent("Event 1", 10, 0, 12, 0); // 10am - 12pm
      const event2 = createEvent("Event 2", 10, 30, 11, 30); // 10:30am - 11:30am
      const event3 = createEvent("Event 3", 11, 0, 11, 30); // 11am - 11:30am
      const allEvents = [event1, event2, event3];

      const position1 = getEventPosition(event1, allEvents);
      const position2 = getEventPosition(event2, allEvents);
      const position3 = getEventPosition(event3, allEvents);

      // Event 1: left = 0%, zIndex should be 2
      expect(position1.left).toBe(0);
      expect(position1.zIndex).toBe(2);

      // Event 2: left = 33.33%, zIndex should be 35 (2 + 33)
      expect(position2.left).toBeCloseTo(33.33, 1);
      expect(position2.zIndex).toBe(35);

      // Event 3: left = 66.67%, zIndex should be 69 (2 + 67)
      expect(position3.left).toBeCloseTo(66.67, 1);
      expect(position3.zIndex).toBe(69);
    });
  });

  describe("Edge cases", () => {
    test("Single event should have full width and 0% offset", () => {
      const event = createEvent("Single Event", 10, 0, 11, 0);
      const position = getEventPosition(event, [event]);

      expect(position.width).toBe(100); // Full width
      expect(position.left).toBe(0); // 0% offset
    });

    test("All-day event should have full width and 0% offset with lower zIndex", () => {
      const event = createEvent("All Day Event", 0, 0, 23, 59, true);
      const position = getEventPosition(event, [event]);

      expect(position.width).toBe(100); // Full width
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(0); // Top at 0
      expect(position.height).toBe(30); // Fixed height for all-day events
      expect(position.zIndex).toBe(1); // Lower z-index for all-day events (not affected by left position)
    });

    test("Two non-overlapping events should both have full width", () => {
      const event1 = createEvent("Event 1", 10, 0, 11, 0); // 10am - 11am
      const event2 = createEvent("Event 2", 12, 0, 13, 0); // 12pm - 1pm
      const allEvents = [event1, event2];

      const position1 = getEventPosition(event1, allEvents);
      const position2 = getEventPosition(event2, allEvents);

      expect(position1.width).toBe(100); // Full width
      expect(position1.left).toBe(0); // 0% offset
      expect(position2.width).toBe(100); // Full width
      expect(position2.left).toBe(0); // 0% offset
    });

    test("Events that touch at boundaries should not overlap", () => {
      const event1 = createEvent("Event 1", 10, 0, 11, 0); // 10am - 11am
      const event2 = createEvent("Event 2", 11, 0, 12, 0); // 11am - 12pm (touches at 11am)
      const allEvents = [event1, event2];

      const position1 = getEventPosition(event1, allEvents);
      const position2 = getEventPosition(event2, allEvents);

      // Both should be able to use full width since they don't actually overlap
      expect(position1.width).toBe(100); // Full width
      expect(position1.left).toBe(0); // 0% offset
      expect(position2.width).toBe(100); // Full width
      expect(position2.left).toBe(0); // 0% offset
    });
  });
});

// Helper to build a calendar event on an arbitrary date
const eventOn = (
  title: string,
  start: Date,
  end: Date,
  allDay: boolean = false,
): CalendarEvent => ({
  title,
  start,
  end,
  daysInterval: 0,
  calendar: "test-calendar",
  allDay,
  eventData: {
    summary: title,
    dtstart: start.toISOString(),
    dtend: end.toISOString(),
  },
});

describe("getNextWeekRange", () => {
  test("when week starts on Monday, end covers the full Sunday including evening", () => {
    // Wednesday 2026-06-03
    const currentDate = new Date(2026, 5, 3);
    const { start, end } = getNextWeekRange(currentDate, 1);

    // Next week starts Monday 2026-06-08 at 00:00
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(8);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    // Next week ends Sunday 2026-06-14 at end-of-day
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(14);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  test("when week starts on Sunday, end covers the full Saturday including evening", () => {
    // Tuesday 2026-06-02
    const currentDate = new Date(2026, 5, 2);
    const { start, end } = getNextWeekRange(currentDate, 0);

    // Next week starts Sunday 2026-06-07 at 00:00
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(7);

    // Next week ends Saturday 2026-06-13 at end-of-day
    expect(end.getDay()).toBe(6);
    expect(end.getDate()).toBe(13);
    expect(end.getHours()).toBe(23);
  });
});

describe("filterEventsInRange (regression for Sunday exclusion)", () => {
  test("includes timed events on the final day of a Monday-starting week", () => {
    // Wednesday 2026-06-03 => next week is Mon 06-08 to Sun 06-14
    const range = getNextWeekRange(new Date(2026, 5, 3), 1);

    const sundayMorning = eventOn(
      "Sunday brunch",
      new Date(2026, 5, 14, 10, 0),
      new Date(2026, 5, 14, 12, 0),
    );
    const sundayEvening = eventOn(
      "Sunday dinner",
      new Date(2026, 5, 14, 18, 0),
      new Date(2026, 5, 14, 20, 0),
    );

    const filtered = filterEventsInRange([sundayMorning, sundayEvening], range);

    expect(filtered).toContain(sundayMorning);
    expect(filtered).toContain(sundayEvening);
  });

  test("includes timed events on the final day of a Sunday-starting week", () => {
    // Tuesday 2026-06-02 => next week is Sun 06-07 to Sat 06-13
    const range = getNextWeekRange(new Date(2026, 5, 2), 0);

    const saturdayEvening = eventOn(
      "Saturday party",
      new Date(2026, 5, 13, 19, 0),
      new Date(2026, 5, 13, 23, 0),
    );

    const filtered = filterEventsInRange([saturdayEvening], range);

    expect(filtered).toContain(saturdayEvening);
  });

  test("includes all-day events on the final day of the week", () => {
    const range = getNextWeekRange(new Date(2026, 5, 3), 1);

    // All-day Sunday event (HA normalizes allDay end to end-of-day)
    const sundayAllDay = eventOn(
      "Sunday all-day",
      new Date(2026, 5, 14, 0, 0),
      new Date(2026, 5, 14, 23, 59, 59),
      true,
    );

    expect(filterEventsInRange([sundayAllDay], range)).toContain(sundayAllDay);
  });

  test("excludes events fully outside the range", () => {
    const range = getNextWeekRange(new Date(2026, 5, 3), 1);

    // The week before next week
    const earlierEvent = eventOn(
      "Earlier",
      new Date(2026, 5, 5, 10, 0),
      new Date(2026, 5, 5, 11, 0),
    );
    // The week after next week
    const laterEvent = eventOn(
      "Later",
      new Date(2026, 5, 16, 10, 0),
      new Date(2026, 5, 16, 11, 0),
    );

    const filtered = filterEventsInRange([earlierEvent, laterEvent], range);
    expect(filtered).not.toContain(earlierEvent);
    expect(filtered).not.toContain(laterEvent);
  });

  test("includes events that fully span the range", () => {
    const range = getNextWeekRange(new Date(2026, 5, 3), 1);

    const spanning = eventOn(
      "Conference",
      new Date(2026, 5, 1, 9, 0),
      new Date(2026, 5, 20, 17, 0),
    );

    expect(filterEventsInRange([spanning], range)).toContain(spanning);
  });
});
