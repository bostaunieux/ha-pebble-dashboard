const DAPPER_LAYOUT_OPTION = {
  value: "custom:pebble-sections-layout",
  label: "Pebble Sections (pebble-dashboard)",
};

// heavily inspired by thomasloven / lovelace-layout-card
customElements.whenDefined("hui-view-editor").then(() => {
  const HuiViewEditor = customElements.get("hui-view-editor");

  const willUpdate = HuiViewEditor.prototype.willUpdate;
  HuiViewEditor.prototype.willUpdate = function (...args) {
    willUpdate?.bind(this)(...args);

    const oldSchema = this._schema;

    this._schema = (...arg) => {
      const computedSchema = oldSchema(...arg);
      const typeSelector = computedSchema.find((e) => e.name == "type");
      if (
        !typeSelector.selector.select.options.find(
          (option) => option.value === DAPPER_LAYOUT_OPTION.value,
        )
      ) {
        typeSelector.selector.select.options.push(DAPPER_LAYOUT_OPTION);
      }

      return computedSchema;
    };
  };

  const firstUpdated = HuiViewEditor.prototype.firstUpdated;
  HuiViewEditor.prototype.firstUpdated = function (...args) {
    firstUpdated?.bind(this)(...args);

    const helpLink = document.createElement("p");
    helpLink.id = "pebble-dashboard-disclaimer";
    helpLink.innerHTML = `
        You have pebble-dashboard installed which adds some options to this dialog. <br/>
        Please see
          <a
            href="https://github.com/bostaunieux/ha-pebble-dashboard"
            target="_blank"
            rel="no referrer"
          >
            pebble-dashboard on github
          </a>
          for usage instructions.
          <style>
            p {padding: 16px 0 0; margin-bottom: 0;}
            a {color: var(--primary-color);}
          </style>
      `;
    this.shadowRoot.appendChild(helpLink);
  };
});
