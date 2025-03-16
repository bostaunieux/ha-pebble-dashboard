import { mdiFormatText } from "@mdi/js";
import { LocalizationKey } from "../localize";

export type CardTextOptions = {
  text_size?: number;
  bg_blur?: number;
};

export const getCardTextOptionsSchema = (localize: (key: LocalizationKey) => string) => ({
  name: "",
  type: "expandable",
  iconPath: mdiFormatText,
  title: localize("shared.editor.form.text-options.title"),
  schema: [
    {
      name: "",
      type: "grid",
      schema: [
        {
          name: "text_size",
          selector: { number: { mode: "box", min: 5, step: 5, unit_of_measurement: "%" } },
          label: localize("shared.editor.form.text-options.text-scale.label"),
        },
        {
          name: "bg_blur",
          selector: { number: { mode: "box", min: 0, step: 1, unit_of_measurement: "px" } },
          label: localize("shared.editor.form.text-options.text-scale.label"),
        },
      ],
    },
  ],
});
