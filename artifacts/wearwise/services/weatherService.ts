export interface HourlyForecastPoint {
  timeMs: number;
  tempC: number;
}

export interface WeatherInfo {
  tempC: number;
  feelsLikeC: number;
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  tempRange: number;
  condition: string;
  bucket: WeatherBucket;
  recommendation: string;
  smartMessage: string;
  hourly: HourlyForecastPoint[];
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

export function smartWeatherMessage(minTemp: number, maxTemp: number): string {
  if (maxTemp < 10) return "Dress warm";
  if (minTemp > 20) return "Keep it light";
  const range = maxTemp - minTemp;
  if (range > 10) return "Layering recommended";
  if (range >= 6) return "Mild variation today";
  return "Stable weather today";
}

// Pick the hourly point closest to a given time (ms since epoch).
export function tempAtTime(
  hourly: HourlyForecastPoint[],
  timeMs: number,
): number | null {
  if (!hourly.length) return null;
  let bestIdx = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < hourly.length; i++) {
    const diff = Math.abs(hourly[i].timeMs - timeMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return hourly[bestIdx].tempC;
}

// Build a derived WeatherInfo whose "current" temperature is taken from the
// hourly forecast at the requested time. Useful for event-aware outfits.
export function weatherForEventTime(
  base: WeatherInfo,
  eventTimeMs: number,
): WeatherInfo {
  const eventTemp = tempAtTime(base.hourly, eventTimeMs);
  if (eventTemp == null) return base;
  const rounded = Math.round(eventTemp);
  return {
    ...base,
    tempC: rounded,
    feelsLikeC: rounded,
    bucket: bucketForTemp(rounded),
    recommendation: recommendationFor(bucketForTemp(rounded)),
  };
}

interface CacheEntry {
  at: number;
  weather: WeatherInfo;
}
const WEATHER_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheKey(loc: LocationInfo): string {
  return `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
}

export function clearWeatherCache(): void {
  WEATHER_CACHE.clear();
}

export async function fetchWeather(
  loc: LocationInfo = DEFAULT_LOCATION,
): Promise<WeatherInfo> {
  const key = cacheKey(loc);
  const cached = WEATHER_CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.weather;
  }

  const params = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    current:
      "temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m",
    minutely_15: "temperature_2m,apparent_temperature",
    hourly: "temperature_2m",
    daily: "temperature_2m_min,temperature_2m_max",
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
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
    };
    daily?: {
      temperature_2m_min?: number[];
      temperature_2m_max?: number[];
    };
  };

  // Prefer the most recent 15-minute observation for a "now" reading.
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

  // Hourly forecast for today (used for event-based weather lookups).
  const hourly: HourlyForecastPoint[] = [];
  const hTimes = data.hourly?.time ?? [];
  const hTemps = data.hourly?.temperature_2m ?? [];
  for (let i = 0; i < Math.min(hTimes.length, hTemps.length); i++) {
    const t = new Date(hTimes[i]).getTime();
    if (!Number.isNaN(t) && typeof hTemps[i] === "number") {
      hourly.push({ timeMs: t, tempC: hTemps[i] });
    }
  }

  // Daily min/max — fall back to derived from hourly, then current.
  const dailyMin = data.daily?.temperature_2m_min?.[0];
  const dailyMax = data.daily?.temperature_2m_max?.[0];
  const fallbackMin = hourly.length
    ? Math.min(...hourly.map((p) => p.tempC))
    : tempC;
  const fallbackMax = hourly.length
    ? Math.max(...hourly.map((p) => p.tempC))
    : tempC;
  const minTemp = Math.round(dailyMin ?? fallbackMin);
  const maxTemp = Math.round(dailyMax ?? fallbackMax);
  const tempRange = Math.max(0, maxTemp - minTemp);

  // Outfit engine bucket: use the daytime peak so suggestions account for the
  // warmest part of the day rather than a cold morning reading.
  const bucket = bucketForTemp(maxTemp);
  const recommendation = recommendationFor(bucket);
  const smartMessage = smartWeatherMessage(minTemp, maxTemp);

  const weather: WeatherInfo = {
    tempC,
    feelsLikeC,
    currentTemp: tempC,
    minTemp,
    maxTemp,
    tempRange,
    condition,
    bucket,
    recommendation,
    smartMessage,
    hourly,
  };

  WEATHER_CACHE.set(key, { at: Date.now(), weather });
  return weather;
}

const FALLBACK_MIN = 14;
const FALLBACK_MAX = 22;

export const FALLBACK_WEATHER: WeatherInfo = {
  tempC: 18,
  feelsLikeC: 18,
  currentTemp: 18,
  minTemp: FALLBACK_MIN,
  maxTemp: FALLBACK_MAX,
  tempRange: FALLBACK_MAX - FALLBACK_MIN,
  condition: "Partly Cloudy",
  bucket: "Mild",
  recommendation: recommendationFor("Mild"),
  smartMessage: smartWeatherMessage(FALLBACK_MIN, FALLBACK_MAX),
  hourly: [],
};
