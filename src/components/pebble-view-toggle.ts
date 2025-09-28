import { html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LitElement } from "lit";

@customElement("pebble-view-toggle")
class PebbleViewToggle extends LitElement {
  @property({ type: String, attribute: "current-view" }) currentView: "month" | "week" = "month";

  private handleViewChange(view: "month" | "week") {
    this.currentView = view;

    this.dispatchEvent(
      new CustomEvent("view-changed", {
        detail: { view },
      }),
    );
  }

  private handleMonthView = () => this.handleViewChange("month");
  private handleWeekView = () => this.handleViewChange("week");

  render() {
    return html`
      <div class="view-toggle">
        <button
          class="toggle-button ${this.currentView === "month" ? "active" : ""}"
          @click=${this.handleMonthView}
          title="Month View"
        >
          <ha-icon icon="mdi:calendar-month"></ha-icon>
        </button>
        <button
          class="toggle-button ${this.currentView === "week" ? "active" : ""}"
          @click=${this.handleWeekView}
          title="Week View"
        >
          <ha-icon icon="mdi:calendar-week"></ha-icon>
        </button>
      </div>
    `;
  }

  static get styles() {
    return css`
      .view-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1000;
        background: var(--card-background-color, #fff);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
      }

      .toggle-button {
        width: 48px;
        height: 48px;
        border: none;
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: var(--secondary-text-color, #666);
      }

      .toggle-button:hover {
        background: var(--divider-color, #e0e0e0);
        color: var(--primary-text-color, #000);
      }

      .toggle-button.active {
        background: var(--primary-color, #03a9f4);
        color: white;
      }

      .toggle-button.active:hover {
        background: var(--primary-color, #03a9f4);
        color: white;
      }

      ha-icon {
        width: 24px;
        height: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pebble-view-toggle": PebbleViewToggle;
  }
}
