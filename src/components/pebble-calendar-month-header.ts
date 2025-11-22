import { html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LocalizationKey } from "../localize";

@customElement("pebble-calendar-month-header")
class PebbleCalendarMonthHeader extends LitElement {
  @property() public localize!: (arg: LocalizationKey) => string;
  @property({ type: String, attribute: "month-name" }) monthName: string = "";
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean, attribute: false }) showNavControls: boolean = false;
  @property({ type: Boolean, attribute: false }) showViewToggle: boolean = false;
  @property({ type: String, attribute: false }) currentView: "month" | "week" | "agenda" = "month";

  private handlePrevClick = () => {
    if (!this.disabled) {
      this.handleNavigated("prev");
    }
  };

  private handleNextClick = () => {
    if (!this.disabled) {
      this.handleNavigated("next");
    }
  };

  private handleTodayClick = () => {
    this.handleNavigated("today");
  };

  private handleNavigated = (type: "prev" | "next" | "today") => {
    this.dispatchEvent(
      new CustomEvent("calendar-navigated", {
        detail: { type },
      }),
    );
  };

  private handleViewChange = (event: CustomEvent) => {
    this.dispatchEvent(
      new CustomEvent("view-changed", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    return html`
      <div class="month-header">
        <div class="month-name">${this.monthName}</div>
        ${this.showViewToggle
          ? html`<pebble-view-toggle
              .currentView=${this.currentView}
              .location=${"header"}
              @view-changed=${this.handleViewChange}
            ></pebble-view-toggle>`
          : nothing}
        ${this.showNavControls
          ? html`<div class="navigation">
              <ha-icon-button @click=${this.handlePrevClick} ?disabled=${this.disabled}>
                <ha-icon icon="mdi:chevron-left"></ha-icon>
              </ha-icon-button>
              <button class="today-button" @click=${this.handleTodayClick}>
                ${this.localize("calendar.card.calendar.today")}
              </button>
              <ha-icon-button @click=${this.handleNextClick} ?disabled=${this.disabled}>
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </ha-icon-button>
            </div>`
          : nothing}
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
        gap: 12px;
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

      .today-button:hover {
        background-color: var(--divider-color, #e0e0e0);
      }

      :host {
        --mdc-icon-size: 24px;
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
