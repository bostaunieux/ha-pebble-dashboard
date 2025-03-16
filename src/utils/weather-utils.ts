import { HassEntity } from "home-assistant-js-websocket";

export const ForecastFeatures = {
  DAILY: 1,
  HOURLY: 2,
  TWICE_DAILY: 4,
} as const;

type ForecastFeatureKey = keyof typeof ForecastFeatures;
type ForecastFeatureType = (typeof ForecastFeatures)[ForecastFeatureKey];

export const supportsFeature = (entity: HassEntity | null, feature: ForecastFeatureType) =>
  entity != null && ((entity.attributes.supported_features ?? 0) & feature) !== 0;

export const getDefaultForecastType = (entity: HassEntity) => {
  if (!entity) {
    return null;
  }

  if (supportsFeature(entity, ForecastFeatures.HOURLY)) {
    return "hourly";
  }

  if (supportsFeature(entity, ForecastFeatures.DAILY)) {
    return "daily";
  }

  if (supportsFeature(entity, ForecastFeatures.TWICE_DAILY)) {
    return "twice_daily";
  }

  return null;
};

export const getFeatureFromForecastType = (type?: Lowercase<ForecastFeatureKey>) => {
  if (!type) {
    return 0;
  }
  return ForecastFeatures[type.toUpperCase() as ForecastFeatureKey];
};
