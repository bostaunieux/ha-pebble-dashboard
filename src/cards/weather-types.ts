import { CardTextOptions } from "./card-options";

export interface ForecastAttribute {
  temperature: number;
  datetime: string;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
  humidity?: number;
  condition?: string;
  is_daytime?: boolean;
  pressure?: number;
  wind_speed?: string;
}

export interface ForecastEvent {
  type: "hourly" | "daily" | "twice_daily";
  forecast: [ForecastAttribute] | null;
}

export type WeatherCardConfig = {
  type: "custom:pebble-weather-card";
  entity: string;
  forecast_type?: "hourly" | "daily" | "twice_daily";
  hide_today?: boolean;
  today_secondary?: ReadonlyArray<"wind" | "sun">;
  hide_forecast?: boolean;
  today_description_inline?: boolean;
} & CardTextOptions;
