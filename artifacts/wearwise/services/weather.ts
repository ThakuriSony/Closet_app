export interface WeatherInfo {
  tempC: number;
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code&temperature_unit=celsius`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const tempC = Math.round(data.current?.temperature_2m ?? 18);
  const code = data.current?.weather_code ?? 2;
  const condition = WEATHER_CODE_MAP[code] ?? "Cloudy";
  const bucket = bucketForTemp(tempC);
  return {
    tempC,
    condition,
    bucket,
    recommendation: recommendationFor(bucket),
  };
}

export const FALLBACK_WEATHER: WeatherInfo = {
  tempC: 18,
  condition: "Partly Cloudy",
  bucket: "Mild",
  recommendation: recommendationFor("Mild"),
};
