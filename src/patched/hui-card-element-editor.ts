import { LitElement } from "lit";

type HuiCardElementEditorType = typeof LitElement & {
  _showLayoutTab: boolean;
};

/**
 * Extend the hui-card-element-editor to add our custom pebble-grid-section as a valid section type
 * to use with the card configuration layout tab. If the internal implementation of this component
 * changes, cards defined within pebble-grid-section will not have a UI option for changing layout.
 */
customElements.whenDefined("hui-card-element-editor").then(() => {
  const HuiCardElementEditor = customElements.get(
    "hui-card-element-editor",
  ) as HuiCardElementEditorType;

  const originalShowLayoutTab = Object.getOwnPropertyDescriptor(
    HuiCardElementEditor.prototype,
    "_showLayoutTab",
  )?.get;
  if (!originalShowLayoutTab) {
    console.warn("Unable to extend hui-card-element-editor: _showLayoutTab is not defined");
    return;
  }

  Object.defineProperty(HuiCardElementEditor.prototype, "_showLayoutTab", {
    get() {
      return (
        originalShowLayoutTab.call(this) ||
        this.sectionConfig?.type === "custom:pebble-stack-section2"
      );
    },
  });
});
