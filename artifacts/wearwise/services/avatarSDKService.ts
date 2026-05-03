/**
 * Avatar SDK (MetaPerson Creator) integration service.
 *
 * HOW TO ACTIVATE:
 * 1. Sign up at https://avatarsdk.com and create a project.
 * 2. Add your credentials as environment variables:
 *      EXPO_PUBLIC_AVATAR_SDK_CLIENT_ID=<your_client_id>
 *      EXPO_PUBLIC_AVATAR_SDK_CLIENT_SECRET=<your_client_secret>
 * 3. Set AVATAR_SDK_ENABLED = true below.
 * 4. The generation flow will immediately use real API calls.
 *
 * Until credentials are provided, the service runs in DEMO mode:
 * - Simulates network delay
 * - Stores avatar_provider = "demo" with no model URL
 * - Falls back to the SVG mannequin renderer everywhere
 */

const AVATAR_SDK_ENABLED =
  !!process.env.EXPO_PUBLIC_AVATAR_SDK_CLIENT_ID &&
  !!process.env.EXPO_PUBLIC_AVATAR_SDK_CLIENT_SECRET;

const CLIENT_ID     = process.env.EXPO_PUBLIC_AVATAR_SDK_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.EXPO_PUBLIC_AVATAR_SDK_CLIENT_SECRET ?? "";

const BASE_URL  = "https://api.avatarsdk.com";
const TOKEN_URL = "https://api.avatarsdk.com/o/token/";

export type GenerationStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export interface AvatarSDKResult {
  provider:      "avatarsdk" | "demo";
  modelUrl:      string | null;
  thumbnailUrl:  string | null;
  computationId: string | null;
}

export interface GenerationProgress {
  status:  GenerationStatus;
  message: string;
  pct:     number;
}

type ProgressCallback = (p: GenerationProgress) => void;

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function generateAvatar(
  facePhotoUri: string | null,
  onProgress: ProgressCallback,
): Promise<AvatarSDKResult> {
  if (!AVATAR_SDK_ENABLED) {
    return runDemoMode(onProgress);
  }
  return runRealGeneration(facePhotoUri, onProgress);
}

// ---------------------------------------------------------------------------
// Demo mode (no credentials)
// ---------------------------------------------------------------------------

async function runDemoMode(cb: ProgressCallback): Promise<AvatarSDKResult> {
  cb({ status: "uploading",   message: "Preparing your avatar…",           pct: 15 });
  await delay(1000);
  cb({ status: "processing",  message: "Calibrating proportions…",         pct: 40 });
  await delay(1200);
  cb({ status: "processing",  message: "Applying skin tone & shading…",    pct: 65 });
  await delay(1000);
  cb({ status: "processing",  message: "Finishing up…",                    pct: 88 });
  await delay(800);
  cb({ status: "done",        message: "Avatar ready!",                    pct: 100 });

  return {
    provider:      "demo",
    modelUrl:      null,
    thumbnailUrl:  null,
    computationId: null,
  };
}

// ---------------------------------------------------------------------------
// Real Avatar SDK generation
// ---------------------------------------------------------------------------

async function runRealGeneration(
  facePhotoUri: string | null,
  cb: ProgressCallback,
): Promise<AvatarSDKResult> {
  // 1. Authenticate
  cb({ status: "uploading", message: "Authenticating…", pct: 5 });
  const token = await getAccessToken();

  // 2. Create computation
  cb({ status: "uploading", message: "Starting avatar computation…", pct: 12 });
  const computationId = await createComputation(token);

  // 3. Upload photo (if provided)
  if (facePhotoUri) {
    cb({ status: "uploading", message: "Uploading your photo…", pct: 25 });
    await uploadPhoto(token, computationId, facePhotoUri);
  }

  // 4. Poll for completion
  cb({ status: "processing", message: "Generating your avatar…", pct: 40 });
  const result = await pollUntilDone(token, computationId, cb);

  cb({ status: "done", message: "Avatar ready!", pct: 100 });
  return {
    provider:      "avatarsdk",
    modelUrl:      result.modelUrl,
    thumbnailUrl:  result.thumbnailUrl,
    computationId,
  };
}

// ---------------------------------------------------------------------------
// Avatar SDK API helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Avatar SDK auth failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

async function createComputation(token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/computations/`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:      "wearwise_avatar",
      pipeline:  "head_2.0",
      // Exported as GLB for 3D preview + PNG thumbnail
      export: {
        format:    "glb",
        thumbnail: true,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create computation (${res.status}): ${text}`);
  }

  const json = await res.json() as { uuid: string };
  return json.uuid;
}

async function uploadPhoto(
  token: string,
  computationId: string,
  photoUri: string,
): Promise<void> {
  const formData = new FormData();

  // React Native FormData accepts { uri, name, type } objects
  formData.append("photo", {
    uri:  photoUri,
    name: "face.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(`${BASE_URL}/computations/${computationId}/upload/`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Photo upload failed (${res.status}): ${text}`);
  }
}

interface PollResult {
  modelUrl:     string | null;
  thumbnailUrl: string | null;
}

async function pollUntilDone(
  token:         string,
  computationId: string,
  cb:            ProgressCallback,
  maxAttempts =  60,
  intervalMs  =  4000,
): Promise<PollResult> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    await delay(intervalMs);
    attempt++;

    const res = await fetch(`${BASE_URL}/computations/${computationId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) continue;

    const json = await res.json() as {
      status:    string;
      progress?: number;
      exports?:  { glb?: string; thumbnail?: string };
    };

    const pct = 40 + Math.min(48, (json.progress ?? 0) * 0.48);
    cb({ status: "processing", message: "Processing avatar…", pct });

    if (json.status === "completed") {
      return {
        modelUrl:     json.exports?.glb       ?? null,
        thumbnailUrl: json.exports?.thumbnail ?? null,
      };
    }

    if (json.status === "failed") {
      throw new Error("Avatar SDK computation failed on the server.");
    }
  }

  throw new Error("Avatar generation timed out. Please try again.");
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
