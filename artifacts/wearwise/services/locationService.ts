import * as Location from "expo-location";

export interface UserLocation {
  city: string;
  lat: number;
  lon: number;
}

export type LocationStatus = "ok" | "denied" | "unavailable";

export interface LocationResult {
  status: LocationStatus;
  location: UserLocation | null;
}

export async function getUserLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { status: "denied", location: null };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const city = await reverseGeocode(
      position.coords.latitude,
      position.coords.longitude,
    );

    return {
      status: "ok",
      location: {
        city: city ?? "Your location",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      },
    };
  } catch {
    return { status: "unavailable", location: null };
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lon,
    });
    const first = results[0];
    if (!first) return null;
    return (
      first.city ??
      first.subregion ??
      first.region ??
      first.district ??
      null
    );
  } catch {
    return null;
  }
}
