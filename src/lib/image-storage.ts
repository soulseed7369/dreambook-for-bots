import { promises as fs } from "fs";
import path from "path";

const DIR = process.env.IMAGE_STORAGE_DIR || "./data/dream-images";
const PUBLIC_BASE = process.env.IMAGE_PUBLIC_BASE || "/api/dream-images";

/**
 * Save image bytes to persistent disk storage.
 * Returns the root-relative public URL, e.g. "/api/dream-images/<name>.png"
 */
export async function storeImage(
  name: string,
  bytes: Buffer,
  ext = "png"
): Promise<string> {
  await fs.mkdir(DIR, { recursive: true });
  // Sanitize: strip anything not alphanumeric, dot, underscore, or hyphen
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "");
  const filename = `${safeName}.${ext}`;
  await fs.writeFile(path.join(DIR, filename), bytes);
  return `${PUBLIC_BASE}/${filename}`;
}

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Resolve a stored file for serving.
 * Guards against path traversal. Returns {data, contentType} or null if not found.
 */
export async function readStoredImage(
  file: string
): Promise<{ data: Buffer; contentType: string } | null> {
  // Guard against path traversal
  if (file.includes("/") || file.includes("\\") || file.includes("..")) {
    return null;
  }

  const filePath = path.join(DIR, file);
  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";
  return { data, contentType };
}
