import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  startOfDay,
  startOfWeek,
  Day,
  getDayOfYear,
  startOfMonth,
  addDays,
  endOfDay,
  addMonths,
  endOfMonth,
  endOfWeek,
  max,
} from "date-fns";
import { HassEntity } from "home-assistant-js-websocket";
import { CalendarCardConfig } from "./calendar-types";
import {
  CalendarEvent,
  fetchCalendarEvents,
  getTimeUntilNextInterval,
} from "../utils/calendar-utils";
import {
  getResolvedMonthViewConfig,
  getResolvedWeekViewConfig,
  getResolvedAgendaViewConfig,
} from "../utils/calendar-config-helpers";
import { getColor } from "../utils/colors";
import type { HomeAssistant } from "../types";
import initLocalize, { LocalizationKey } from "../localize";
import "./pebble-calendar-card-editor";
import { ForecastAttribute, ForecastEvent } from "./weather-types";
import { ForecastFeatures, supportsFeature } from "../utils/weather-utils";
import "../components/pebble-basic-calendar";
import "../components/pebble-spanning-calendar";
import "../components/pebble-week-calendar";
import "../components/pebble-agenda-calendar";
import "../components/pebble-view-toggle";

const WEATHER_RETRIES = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000, 60_000];

@customElement("pebble-calendar-card")
class PebbleCalendarCard extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;

  @state() private config: CalendarCardConfig;

  @state() private events: CalendarEvent[];

  @state() private weather: HassEntity | null;

  @state() private weatherForecast?: Map<number, ForecastAttribute>;

  @state() private currentView: "month" | "week" | "agenda" = "month";

  private _retryCount: number;

  private _unsubscribeFromWeather?: () => Promise<void>;

  private reloadIntervalId?: NodeJS.Timeout;

  private reloadTimeoutId?: NodeJS.Timeout;

  private localize: (key: LocalizationKey) => string;

  private activeDate?: Date;

  static get properties() {
    return {
      hass: { attribute: false },
      config: {},
      events: {},
    };
  }

  constructor() {
    super();
    this.config = {
      type: "custom:pebble-calendar-card",
      calendars: [],
      show_view_toggle: false,
      view_type: "month",
      event_refresh_interval: 15,
      enable_weather: false,
      // View-specific overrides (initially empty)
      month_view: {},
      week_view: {},
      agenda_view: {},
    };
    this._retryCount = 0;
    this.weather = null;
    this.events = [];
    this.localize = initLocalize(this._hass);
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateComplete.then(() => this._fetchEvents());
    this._setupEventLoader();
    this._subscribeToWeather();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearRefreshTimers();
  }

  set hass(hass: HomeAssistant) {
    if (this.config.weather_entity) {
      this.weather = hass.states?.[this.config.weather_entity];
    }

    this._hass = hass;
  }

  setConfig(config: CalendarCardConfig) {
    const prevConfig = this.config;
    this.config = config;
    this.currentView = config.view_type ?? "month";

    if (config.calendars && config.calendars.length === 0) {
      this.events = [];
      return;
    }

    const eventRefreshIntervalChanged =
      prevConfig.event_refresh_interval !== config.event_refresh_interval;
    if (prevConfig.calendars !== config.calendars || eventRefreshIntervalChanged) {
      if (eventRefreshIntervalChanged) {
        this._setupEventLoader();
      }

      // check if calendar entities changed
      if (
        JSON.stringify(prevConfig.calendars?.map((c) => c.entity).sort()) ===
        JSON.stringify(config.calendars?.map((c) => c.entity).sort())
      ) {
        // if calendars are the same, then update the colors
        this.events = this.events.map((event) => {
          return {
            ...event,
            color: config.calendars?.find((cal) => cal.entity === event.calendar)?.color,
          };
        });
        return;
      }

      this._fetchEvents();
    }

    if (this.config.enable_weather) {
      this._subscribeToWeather();
    } else {
      this._unsubscribeFromWeather?.();
    }
  }

  private _clearRefreshTimers() {
    if (this.reloadTimeoutId) {
      clearTimeout(this.reloadTimeoutId);
      this.reloadTimeoutId = undefined;
    }
    if (this.reloadIntervalId) {
      clearInterval(this.reloadIntervalId);
      this.reloadIntervalId = undefined;
    }
  }

  _setupEventLoader() {
    this._clearRefreshTimers();

    const interval = this.config.event_refresh_interval ?? 15;
    const delay = getTimeUntilNextInterval(interval);

    // Set a timeout to start the task at the beginning of the next quarter hour
    this.reloadTimeoutId = setTimeout(() => {
      this._fetchEvents();

      // Set an interval to execute the task every quarter hour after that
      this.reloadIntervalId = setInterval(() => this._fetchEvents(), interval * 60 * 1_000);
    }, delay);
  }

  private calculateDateRange(currentDate?: Date | number): { start: Date; end: Date } {
    const targetDate = startOfDay(currentDate ?? Date.now());
    const viewType = this.config.view_type ?? "month";

    if (viewType === "week") {
      const weekConfig = getResolvedWeekViewConfig(this.config);
      return this.calculateWeekViewDateRange(targetDate, weekConfig.week_start as Day);
    } else if (viewType === "agenda") {
      const agendaConfig = getResolvedAgendaViewConfig(this.config);
      return this.calculateAgendaViewDateRange(targetDate, agendaConfig.week_start as Day);
    } else {
      const monthConfig = getResolvedMonthViewConfig(this.config);
      return this.calculateMonthViewDateRange(targetDate, monthConfig.week_start as Day);
    }
  }

  private calculateWeekViewDateRange(today: Date, weekStartsOn: Day): { start: Date; end: Date } {
    const weekConfig = getResolvedWeekViewConfig(this.config);
    const weekCalendarView = weekConfig.week_calendar_view;

    switch (weekCalendarView) {
      case "next_5_days":
        // Start from current day, show next 5 days
        return {
          start: startOfDay(today),
          end: endOfDay(addDays(today, 4)),
        };
      case "next_7_days":
        // Start from current day, show next 7 days
        return {
          start: startOfDay(today),
          end: endOfDay(addDays(today, 6)),
        };
      case "current_week":
      default: {
        // Start from the beginning of the current week, show 7 days
        const weekStart = startOfWeek(today, { weekStartsOn });
        return {
          start: weekStart,
          end: endOfDay(addDays(weekStart, 6)),
        };
      }
    }
  }

  private calculateAgendaViewDateRange(today: Date, weekStartsOn: Day): { start: Date; end: Date } {
    // Current week + next week (14 days total)
    const weekStart = startOfWeek(today, { weekStartsOn });
    return {
      start: weekStart,
      end: endOfDay(addDays(weekStart, 13)), // 2 weeks
    };
  }

  private calculateMonthViewDateRange(
    targetDate: Date,
    weekStartsOn: Day,
  ): { start: Date; end: Date } {
    const today = new Date();
    const currentMonth = startOfMonth(today);

    // Determine effective focus (can't go before current month for event fetching)
    const startDate = max([targetDate, currentMonth]);

    // Always fetch: focus month + next 2 months
    const endDate = addMonths(startDate, 2);

    const start = startOfWeek(startOfMonth(startDate), { weekStartsOn });
    const end = endOfWeek(endOfMonth(endDate), { weekStartsOn });

    return { start, end };
  }

  async _fetchEvents() {
    if (!this._hass || !this.config.calendars || !this.config.calendars.length) {
      return;
    }

    const { start, end } = this.calculateDateRange(this.activeDate);
    const { events, errors } = await fetchCalendarEvents(
      this._hass,
      start,
      end,
      this.config.calendars?.map((entry, index) => {
        const entity_id = typeof entry === "string" ? entry : entry.entity;
        return {
          entity_id,
          color: entry?.color ?? getColor(index),
        };
      }) || [],
    );

    if (errors.length) {
      console.error("Encountered errors fetching calendar events: ", errors);
    }
    if (!errors.length || events.length) {
      this.events = events;
    }
  }

  private handleViewChange = (event: CustomEvent) => {
    const view = event.detail.view;
    this.currentView = view;
    this.config = { ...this.config, view_type: view };
    // Refresh events when view type changes since date range will be different
    this._fetchEvents();
  };

  private handleDateRangeChange = (event: CustomEvent) => {
    this.activeDate = event.detail.currentDate;
    this._fetchEvents();
  };

  render() {
    if (this.currentView === "week") {
      return html`
        <pebble-week-calendar
          .weekStartsOn=${getResolvedWeekViewConfig(this.config).week_start}
          .weekCalendarView=${getResolvedWeekViewConfig(this.config).week_calendar_view}
          .textSize=${this.config?.text_size}
          .eventsSpanDays=${getResolvedWeekViewConfig(this.config).events_span_days}
          .events=${this.events}
          .weatherForecast=${this.weatherForecast}
          .localize=${this.localize}
          .hass=${this._hass}
          @date-range-changed=${this.handleDateRangeChange}
        ></pebble-week-calendar>
        ${this.config?.show_view_toggle
          ? html`<pebble-view-toggle
              .currentView=${this.currentView}
              @view-changed=${this.handleViewChange}
            ></pebble-view-toggle>`
          : nothing}
      `;
    }

    if (this.currentView === "agenda") {
      return html`
        <pebble-agenda-calendar
          .weekStartsOn=${getResolvedAgendaViewConfig(this.config).week_start}
          .textSize=${this.config?.text_size}
          .events=${this.events}
          .weatherForecast=${this.weatherForecast}
          .localize=${this.localize}
          .hass=${this._hass}
          @date-range-changed=${this.handleDateRangeChange}
        ></pebble-agenda-calendar>
        ${this.config?.show_view_toggle
          ? html`<pebble-view-toggle
              .currentView=${this.currentView}
              @view-changed=${this.handleViewChange}
            ></pebble-view-toggle>`
          : nothing}
      `;
    }

    return html`
      ${getResolvedMonthViewConfig(this.config).events_span_days
        ? html`<pebble-spanning-calendar
            .weekStartsOn=${getResolvedMonthViewConfig(this.config).week_start}
            .monthCalendarStart=${getResolvedMonthViewConfig(this.config).month_calendar_start}
            .textSize=${this.config?.text_size}
            .events=${this.events}
            .weatherForecast=${this.weatherForecast}
            .localize=${this.localize}
            .hass=${this._hass}
            @date-range-changed=${this.handleDateRangeChange}
          ></pebble-spanning-calendar>`
        : html`<pebble-basic-calendar
            .weekStartsOn=${getResolvedMonthViewConfig(this.config).week_start}
            .monthCalendarStart=${getResolvedMonthViewConfig(this.config).month_calendar_start}
            .textSize=${this.config?.text_size}
            .events=${this.events}
            .weatherForecast=${this.weatherForecast}
            .localize=${this.localize}
            .hass=${this._hass}
            @date-range-changed=${this.handleDateRangeChange}
          ></pebble-basic-calendar>`}
      ${this.config?.show_view_toggle
        ? html`<pebble-view-toggle
            .currentView=${this.currentView}
            @view-changed=${this.handleViewChange}
          ></pebble-view-toggle>`
        : nothing}
    `;
  }

  async _subscribeToWeather() {
    if (!this.isConnected || !this.config || !this._hass) {
      return;
    }

    const { enable_weather, weather_entity } = this.config;
    if (!weather_entity || !enable_weather) {
      return;
    }

    if (!supportsFeature(this.weather, ForecastFeatures.DAILY)) {
      throw new Error(`Weather entity "${weather_entity}" does not support daily forecasts.`);
    }

    this._unsubscribeFromWeather?.();

    try {
      this._unsubscribeFromWeather = await this._hass.connection.subscribeMessage<ForecastEvent>(
        (event) => {
          this.weatherForecast = event.forecast?.reduce((entries, entry) => {
            entries.set(getDayOfYear(entry.datetime), entry);
            return entries;
          }, new Map<number, ForecastAttribute>());

          this._retryCount = 0;
        },
        {
          type: "weather/subscribe_forecast",
          forecast_type: "daily",
          entity_id: weather_entity,
        },
      );
    } catch (e) {
      console.error("pebble-calendar-card: Error subscribing to weather forecast: ", e);
      const delay = WEATHER_RETRIES[this._retryCount];
      if (delay) {
        console.info("pebble-calendar-card: Will retry, attempt after delay: ", delay);
        this._retryCount++;
        setTimeout(() => {
          this._subscribeToWeather();
        }, delay);
      } else {
        console.warn("pebble-calendar-card: Hit max subscribe retry events, aborting.");
      }
    }
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 11;
  }

  static getConfigElement() {
    return document.createElement("pebble-calendar-card-editor");
  }

  static getStubConfig() {
    return { num_weeks: 4, calendars: [] };
  }

  static get styles() {
    return [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-calendar-card": PebbleCalendarCard;
  }
}
