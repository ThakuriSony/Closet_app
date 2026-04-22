export interface WeatherInfo {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  bucket: WeatherBucket;
  recommendation: string;
}

export type WeatherBucket = "Cold" | "Mild" | "Hot";

export interface LocationInfo {
  name: string;
  lat: number;
  lon: number;
}

export const DEFAULT_LOCATION: LocationInfo = {
  name: "Wichita",
  lat: 37.6872,
  lon: -97.3301,
};

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Foggy",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Heavy Showers",
  85: "Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Severe Thunderstorm",
};

export function bucketForTemp(tempC: number): WeatherBucket {
  if (tempC < 10) return "Cold";
  if (tempC <= 20) return "Mild";
  return "Hot";
}

function recommendationFor(bucket: WeatherBucket): string {
  if (bucket === "Cold") return "Layer up";
  if (bucket === "Hot") return "Keep it light";
  return "Light jacket recommended";
}

export async function fetchWeather(
  loc: LocationInfo = DEFAULT_LOCATION,
): Promise<WeatherInfo> {
  const params = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    current:
      "temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m",
    minutely_15: "temperature_2m,apparent_temperature",
    timezone: "auto",
    forecast_days: "1",
    past_minutely_15: "1",
    temperature_unit: "celsius",
    models: "best_match",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" } as RequestInit);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      weather_code?: number;
    };
    minutely_15?: {
      time?: string[];
      temperature_2m?: number[];
      apparent_temperature?: number[];
    };
  };

  // Prefer the most recent 15-minute observation closest to "now" for better
  // alignment with consumer weather apps; fall back to current if missing.
  let rawTemp = data.current?.temperature_2m;
  let rawFeels = data.current?.apparent_temperature;
  const times = data.minutely_15?.time;
  const temps = data.minutely_15?.temperature_2m;
  const feels = data.minutely_15?.apparent_temperature;
  if (times && temps && times.length === temps.length && times.length > 0) {
    const now = Date.now();
    let bestIdx = 0;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]).getTime();
      const diff = Math.abs(now - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    rawTemp = temps[bestIdx] ?? rawTemp;
    if (feels && feels[bestIdx] != null) rawFeels = feels[bestIdx];
  }

  const tempC = Math.round(rawTemp ?? 18);
  const feelsLikeC = Math.round(rawFeels ?? tempC);
  const code = data.current?.weather_code ?? 2;
  const condition = WEATHER_CODE_MAP[code] ?? "Cloudy";
  const bucket = bucketForTemp(tempC);
  return {
    tempC,
    feelsLikeC,
    condition,
    bucket,
    recommendation: recommendationFor(bucket),
  };
}

export const FALLBACK_WEATHER: WeatherInfo = {
  tempC: 18,
  feelsLikeC: 18,
  condition: "Partly Cloudy",
  bucket: "Mild",
  recommendation: recommendationFor("Mild"),
};
