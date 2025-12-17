import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { addDays, differenceInHours, formatDistanceStrict, parseISO } from "date-fns";
import type { HomeAssistant } from "../types";
import { CountdownCardConfig } from "./countdown-types";
import initLocalize from "../localize";
import "./pebble-countdown-card-editor";

@customElement("pebble-countdown-card")
class PebbleCountdownCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: CountdownCardConfig;
  @state() private now: Date = new Date();

  private _interval?: NodeJS.Timeout;

  private get localize() {
    return initLocalize(this.hass);
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this._interval = setInterval(() => {
      this.now = new Date();
    }, 60_000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) {
      clearInterval(this._interval);
    }
  }

  setConfig(config: CountdownCardConfig) {
    this.config = config;
  }

  private getCalendarAttributes() {
    if (!this.config.entity || !this.hass.states[this.config.entity]) {
      return null;
    }
    return this.hass.states[this.config.entity].attributes;
  }

  private _formatDuration(start: string) {
    const target = parseISO(start);
    const now = this.now;

    const diffInHours = differenceInHours(target, now);

    if (diffInHours >= 24) {
      return formatDistanceStrict(target, now, { unit: "day" });
    } else if (diffInHours >= 1) {
      return formatDistanceStrict(target, now, { unit: "hour" });
    } else {
      return formatDistanceStrict(target, now, { unit: "minute" });
    }
  }

  render() {
    if (!this.config || !this.hass) {
      return nothing;
    }

    let title: string | undefined;
    let startTime: string | undefined;

    if (this.config.entity) {
      const attributes = this.getCalendarAttributes();
      if (attributes) {
        title = attributes.message || attributes.friendly_name;
        startTime = attributes.start_time;
      }
    } else if (this.config.date) {
      // Use static date if configured
      title = this.config.title;
      startTime = this.config.date;
    }

    title = title ?? this.localize("countdown.card.default-countdown-label");

    // If no valid next event found
    if (!startTime || parseISO(startTime) < this.now) {
      if (this.config.hide_if_no_event) {
        return nothing;
      }
      return html`
        <ha-card class="no-event">
          <div class="card-content">
            ${this.config.no_event_text || this.localize("calendar.card.calendar.no-events")}
          </div>
        </ha-card>
      `;
    }

    const timeDisplay = this._formatDuration(startTime);

    const textSize = this.config.text_size;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="card">
          <div class="title">${title}</div>
          <div class="time-remaining">${timeDisplay}</div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 1;
  }

  static getConfigElement() {
    return document.createElement("pebble-countdown-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Countdown",
      date: addDays(new Date(), 31).toISOString().split("T")[0],
      hide_if_no_event: true,
    };
  }

  static get styles() {
    return css`
      ha-card {
        font-size: var(--pebble-font-size, var(--card-primary-font-size, 16px));
        padding: 12px;
        height: 100%;
        display: grid;
        align-items: center;
        text-align: center;
        overflow: auto;
      }

      .card {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }

      .time-remaining {
        font-size: 1em;
        opacity: 0.8;
      }

      .title {
        font-size: 1.5em;
        font-weight: bold;
        line-height: 120%;
      }

      .no-event {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-countdown-card": PebbleCountdownCard;
  }
}
