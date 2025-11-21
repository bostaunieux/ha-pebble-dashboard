import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("pebble-calendar-month-header")
class PebbleCalendarMonthHeader extends LitElement {
  @property({ type: String, attribute: "month-name" }) monthName: string = "";
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ attribute: false }) onNavigatePrev?: () => void;
  @property({ attribute: false }) onNavigateNext?: () => void;
  @property({ attribute: false }) onNavigateToday?: () => void;

  private handlePrevClick = () => {
    if (!this.disabled && this.onNavigatePrev) {
      this.onNavigatePrev();
    }
  };

  private handleNextClick = () => {
    if (!this.disabled && this.onNavigateNext) {
      this.onNavigateNext();
    }
  };

  private handleTodayClick = () => {
    if (!this.disabled && this.onNavigateToday) {
      this.onNavigateToday();
    }
  };

  render() {
    return html`
      <div class="month-header">
        <div class="month-name">${this.monthName}</div>
        <div class="navigation ${this.disabled ? 'disabled' : ''}">
          <ha-icon-button @click=${this.handlePrevClick} ?disabled=${this.disabled}>
            <ha-icon icon="mdi:chevron-left"></ha-icon>
          </ha-icon-button>
          <button class="today-button" @click=${this.handleTodayClick} ?disabled=${this.disabled}>
            Today
          </button>
          <ha-icon-button @click=${this.handleNextClick} ?disabled=${this.disabled}>
            <ha-icon icon="mdi:chevron-right"></ha-icon>
          </ha-icon-button>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .month-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--divider-color, #e0e0e0);
      }

      .month-name {
        font-size: 2em;
        line-height: 100%;
        flex: 1;
      }

      .navigation {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .navigation.disabled {
        opacity: 0.4;
        pointer-events: none;
      }

      .today-button {
        background: transparent;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 1em;
        font-weight: bold;
        color: var(--primary-text-color);
        transition: background-color 0.2s ease;
      }

      .today-button:hover:not(:disabled) {
        background-color: var(--divider-color, #e0e0e0);
      }

      .today-button:disabled {
        cursor: not-allowed;
      }

      :host {
        --mdc-icon-size: 28px;
        --mdc-icon-button-size: 44px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-calendar-month-header": PebbleCalendarMonthHeader;
  }
}

