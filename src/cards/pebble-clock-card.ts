import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { format } from "date-fns";
import type { HomeAssistant } from "../types";
import { ClockCardConfig } from "./pebble-clock-card-editor";
import "./pebble-clock-card-editor";

@customElement("pebble-clock-card")
class PebbleClockCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config: ClockCardConfig;

  @state() private now: Date;

  constructor() {
    super();

    this.now = new Date();
    this.config = {
      type: "custom:pebble-clock-card",
      show_seconds: false,
      show_date: false,
    };

    setInterval(() => {
      this.now = new Date();
    }, 1000);
  }

  render() {
    const hoursAndMinutes = format(this.now, "h:mm");
    const seconds = this.config.show_seconds ? format(this.now, "ss") : null;

    const date = format(this.now, "EEEE, MMMM do");

    const textSize = this.config.text_size;
    const styles = {
      "--pebble-font-size": textSize
        ? `calc(var(--card-primary-font-size, 16px) * ${textSize} / 100)`
        : undefined,
    };

    return html`
      <ha-card style=${styleMap(styles)}>
        <div class="card">
          <div class="time">
            <div class="hours-minutes">${hoursAndMinutes}</div>
            ${seconds && html`<div class="seconds">${seconds}</div>`}
          </div>
          ${this.config.show_date ? html`<div class="date">${date}</div>` : null}
        </div>
      </ha-card>
    `;
  }

  setConfig(config: ClockCardConfig) {
    this.config = config;
  }

  getCardSize() {
    return 1;
  }

  static getConfigElement() {
    return document.createElement("pebble-clock-card-editor");
  }

  static getStubConfig() {
    return { show_seconds: false, show_date: true };
  }

  static get styles() {
    return css`
      ha-card {
        font-size: var(--pebble-font-size, var(--card-primary-font-size, 16px));
        padding: 12px;
        background-size: cover;
        height: 100%;
        display: grid;
        align-items: end;
      }

      .time {
        display: flex;
        gap: 2px;
        line-height: 5em;
      }
      .hours-minutes {
        font-size: 4em;
      }
      .seconds {
        font-size: 1.75em;
        line-height: 1.9em;
      }
      .date {
        margin-top: 12px;
        font-size: 1.5em;
        line-height: 120%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-clock-card": PebbleClockCard;
  }
}
