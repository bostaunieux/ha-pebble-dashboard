import * as en from "./localization/en.json";
import type { HomeAssistant } from "./types";

const DEFAULT_LANG = "en";

type TranslationDict = typeof en;

const LANGUAGES: Record<string, TranslationDict> = {
  en,
};

type FlattenObjectKeys<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any>,
  Key extends keyof T = keyof T,
> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}.${FlattenObjectKeys<T[Key]>}`
    : `${Key}`
  : never;

export type LocalizationKey = FlattenObjectKeys<TranslationDict>;

export default function initLocalize(hass: HomeAssistant) {
  return (key: LocalizationKey): string => {
    const lang = hass?.locale.language ?? DEFAULT_LANG;
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentLocalization: any = LANGUAGES[lang];

    for (const k of keys) {
      if (!currentLocalization || typeof currentLocalization !== "object") {
        return key;
      }
      currentLocalization = currentLocalization[k];
    }

    return (currentLocalization as string) ?? key;
  };
}
