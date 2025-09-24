import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { startOfDay, startOfWeek, Day, getDayOfYear, startOfMonth, addDays } from "date-fns";
import { HassEntity } from "home-assistant-js-websocket";
import { CalendarCardConfig } from "./calendar-types";
import {
  CalendarEvent,
  fetchCalendarEvents,
  getTimeUntilNextInterval,
} from "../utils/calendar-utils";
import { getColor } from "../utils/colors";
import type { HomeAssistant } from "../types";
import initLocalize, { LocalizationKey } from "../localize";
import "./pebble-calendar-card-editor";
import { ForecastAttribute, ForecastEvent } from "./weather-types";
import { ForecastFeatures, supportsFeature } from "../utils/weather-utils";
import "../components/pebble-basic-calendar";
import "../components/pebble-spanning-calendar";
import "../components/pebble-week-calendar";
import "../components/pebble-view-toggle";

const WEATHER_RETRIES = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000, 60_000];

@customElement("pebble-calendar-card")
class PebbleCalendarCard extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;

  @state() private config: CalendarCardConfig;

  @state() private events: CalendarEvent[];

  @state() private weather: HassEntity | null;

  @state() private weatherForecast?: Map<number, ForecastAttribute>;

  @state() private currentView: "month" | "week" = "month";

  private _retryCount: number;

  private _unsubscribeFromWeather?: () => Promise<void>;

  private reloadIntervalId?: NodeJS.Timeout;

  private reloadTimeoutId?: NodeJS.Timeout;

  private localize: (key: LocalizationKey) => string;

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
      week_start: "0",
      calendars: [],
      view_type: "month",
      week_days: 7,
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

  async _fetchEvents() {
    if (!this._hass || !this.config.calendars || !this.config.calendars.length) {
      return;
    }

    const today = startOfDay(Date.now());
    const numWeeks = this.config.num_weeks ?? 12;
    const monthCalendarStart = this.config.month_calendar_start ?? "current_week";

    const startDate =
      monthCalendarStart === "start_of_month"
        ? startOfMonth(today)
        : startOfWeek(today, {
            weekStartsOn: +(this.config.week_start ?? "0") as Day,
          });

    const weekStartsOn = +(this.config.week_start ?? "0") as Day;
    const startWeekStart = startOfWeek(startDate, { weekStartsOn });
    const endWeekStart = addDays(startWeekStart, (numWeeks - 1) * 7);
    const endWeekEnd = addDays(endWeekStart, 6);

    const start = startWeekStart;
    const end = endWeekEnd;

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

  private handleViewChange = (view: "month" | "week") => {
    this.currentView = view;
    this.config = { ...this.config, view_type: view };
  };

  render() {
    if (this.currentView === "week") {
      return html`
        <pebble-week-calendar
          .weekStartsOn=${this.config?.week_start}
          .weekDays=${this.config?.week_days ?? 7}
          .textSize=${this.config?.text_size}
          .eventsSpanDays=${this.config?.events_span_days ?? false}
          .events=${this.events}
          .weatherForecast=${this.weatherForecast}
          .localize=${this.localize}
          .hass=${this._hass}
        ></pebble-week-calendar>
        <pebble-view-toggle
          .currentView=${this.currentView}
          .onViewChange=${this.handleViewChange}
        ></pebble-view-toggle>
      `;
    }

    return html`
      ${this.config?.events_span_days
        ? html`<pebble-spanning-calendar
            .weekStartsOn=${this.config?.week_start}
            .numWeeks=${this.config?.num_weeks}
            .startPosition=${this.config?.month_calendar_start}
            .textSize=${this.config?.text_size}
            .events=${this.events}
            .weatherForecast=${this.weatherForecast}
            .localize=${this.localize}
            .hass=${this._hass}
          ></pebble-spanning-calendar>`
        : html`<pebble-basic-calendar
            .weekStartsOn=${this.config?.week_start}
            .numWeeks=${this.config?.num_weeks}
            .startPosition=${this.config?.month_calendar_start}
            .textSize=${this.config?.text_size}
            .events=${this.events}
            .weatherForecast=${this.weatherForecast}
            .localize=${this.localize}
            .hass=${this._hass}
          ></pebble-basic-calendar>`}
      <pebble-view-toggle
        .currentView=${this.currentView}
        .onViewChange=${this.handleViewChange}
      ></pebble-view-toggle>
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
