// Use the legacy API surface — the new SDK 54 class-based API is more
// awkward for the simple read/write/cache pattern we need here.
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

// Background-removal pipeline.
//
// 1. Read the source image as base64.
// 2. POST it to the API server, which proxies to a removal provider
//    (currently remove.bg) and returns a transparent PNG as base64.
// 3. Persist the PNG to the app's document directory under a deterministic
//    filename derived from the source path. Subsequent calls for the same
//    source are short-circuited via the on-disk cache.
//
// On any failure we resolve with `null` so callers can fall back to the
// original image without breaking the user experience.

const PROCESSED_DIR_NAME = "processed";

function apiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${domain}`;
}

// Cheap deterministic 32-bit hash of a string. Good enough to uniquely key
// the processed PNG against the source URI.
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

async function ensureProcessedDir(): Promise<string | null> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return null;
  const dir = `${docDir}${PROCESSED_DIR_NAME}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

function processedPath(dir: string, sourceUri: string): string {
  return `${dir}${hashString(sourceUri)}.png`;
}

async function readSourceAsBase64(uri: string): Promise<string | null> {
  // On native, read the file directly.
  if (Platform.OS !== "web") {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      return null;
    }
  }
  // On web, fetch the blob and decode it.
  try {
    const blob = await (await fetch(uri)).blob();
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const comma = result.indexOf(",");
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        } else {
          reject(new Error("FileReader returned no string"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(blob);
    });
    return base64;
  } catch {
    return null;
  }
}

interface RemoveBgResponse {
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

async function callRemoveBg(
  imageBase64: string,
  mimeType: string,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/api/images/remove-bg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let data: RemoveBgResponse;
  try {
    data = (await res.json()) as RemoveBgResponse;
  } catch {
    return null;
  }
  return typeof data.imageBase64 === "string" && data.imageBase64.length > 0
    ? data.imageBase64
    : null;
}

/**
 * Returns a local file URI for a background-removed PNG of the source image,
 * or `null` if the pipeline could not produce one (caller should fall back
 * to the original `sourceUri`).
 */
export async function ensureProcessedImage(
  sourceUri: string,
  options?: { sourceBase64?: string; mimeType?: string },
): Promise<string | null> {
  if (!sourceUri) return null;

  const dir = await ensureProcessedDir();
  if (!dir) return null;
  const target = processedPath(dir, sourceUri);

  // Cache hit — we've already processed this exact source.
  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists && existing.size && existing.size > 0) {
    return target;
  }

  const base64 =
    options?.sourceBase64 ?? (await readSourceAsBase64(sourceUri));
  if (!base64) return null;

  const mimeType = options?.mimeType ?? "image/jpeg";
  const processedB64 = await callRemoveBg(base64, mimeType);
  if (!processedB64) return null;

  try {
    await FileSystem.writeAsStringAsync(target, processedB64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }

  return target;
}
