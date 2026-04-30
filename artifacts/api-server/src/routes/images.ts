import { Router, type IRouter } from "express";

const router: IRouter = Router();

const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

interface RemoveBgRequest {
  imageBase64?: unknown;
  mimeType?: unknown;
}

router.post("/images/remove-bg", async (req, res) => {
  const apiKey = process.env["REMOVE_BG_API_KEY"];
  if (!apiKey) {
    res.status(503).json({
      error: "background-removal-disabled",
      message:
        "Background removal is not configured on the server (missing REMOVE_BG_API_KEY).",
    });
    return;
  }

  const body = (req.body ?? {}) as RemoveBgRequest;
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType
      ? body.mimeType
      : "image/jpeg";

  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(imageBase64, "base64");
  } catch {
    res.status(400).json({ error: "imageBase64 is not valid base64" });
    return;
  }

  const form = new FormData();
  form.append("size", "auto");
  form.append("format", "png");
  // `crop=true` trims away empty borders so the returned PNG is tight to the
  // subject. This is what gives the lookbook layout consistent visual weight
  // per category — without it, items photographed with lots of empty space
  // would render small inside their bounding box.
  form.append("crop", "true");
  form.append("crop_margin", "5%");
  // Convert the Node Buffer to a Blob the global FormData understands.
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  form.append("image_file", blob, "upload.jpg");

  let upstream: Response;
  try {
    upstream = await fetch(REMOVE_BG_ENDPOINT, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });
  } catch (err) {
    req.log.error({ err }, "remove.bg request failed");
    res.status(502).json({ error: "background-removal-unavailable" });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    req.log.warn(
      { status: upstream.status, body: text.slice(0, 300) },
      "remove.bg returned non-OK",
    );
    res.status(502).json({
      error: "background-removal-failed",
      status: upstream.status,
    });
    return;
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const out = Buffer.from(arrayBuffer).toString("base64");
  res.json({ imageBase64: out, mimeType: "image/png" });
});

export default router;
