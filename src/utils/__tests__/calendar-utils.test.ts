import { getEventPosition, CalendarEvent } from "../calendar-utils";

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

    test("Event A (10am-2pm) should have 1/2 width and 0% offset", () => {
      const position = getEventPosition(eventA, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(600); // 10am = 10 * 60 = 600 minutes
      expect(position.height).toBe(240); // 4 hours = 240 minutes
    });

    test("Event B (11am-11:30am) should have 1/2 width and 50% offset", () => {
      const position = getEventPosition(eventB, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
      expect(position.left).toBe(50); // 50% offset
      expect(position.top).toBe(660); // 11am = 11 * 60 = 660 minutes
      expect(position.height).toBe(30); // 30 minutes
    });

    test("Event C (1pm-1:30pm) should have 1/2 width and 50% offset", () => {
      const position = getEventPosition(eventC, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
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

    test("Event A (10am-11am) should have 1/2 width and 0% offset", () => {
      const position = getEventPosition(eventA, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(600); // 10am = 10 * 60 = 600 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });

    test("Event B (10:30am-11:30am) should have 1/2 width and 50% offset", () => {
      const position = getEventPosition(eventB, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
      expect(position.left).toBe(50); // 50% offset
      expect(position.top).toBe(630); // 10:30am = 10 * 60 + 30 = 630 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });

    test("Event C (11am-12pm) should have 1/2 width and 0% offset", () => {
      const position = getEventPosition(eventC, allEvents);

      expect(position.width).toBe(50); // 1/2 width = 50%
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(660); // 11am = 11 * 60 = 660 minutes
      expect(position.height).toBe(60); // 1 hour = 60 minutes
    });
  });

  describe("Edge cases", () => {
    test("Single event should have full width and 0% offset", () => {
      const event = createEvent("Single Event", 10, 0, 11, 0);
      const position = getEventPosition(event, [event]);

      expect(position.width).toBe(100); // Full width
      expect(position.left).toBe(0); // 0% offset
    });

    test("All-day event should have full width and 0% offset", () => {
      const event = createEvent("All Day Event", 0, 0, 23, 59, true);
      const position = getEventPosition(event, [event]);

      expect(position.width).toBe(100); // Full width
      expect(position.left).toBe(0); // 0% offset
      expect(position.top).toBe(0); // Top at 0
      expect(position.height).toBe(30); // Fixed height for all-day events
      expect(position.zIndex).toBe(1); // Lower z-index for all-day events
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
