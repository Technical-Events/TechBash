/** Image sniffing for uploads. Pure: tests import this file. */

export type PhotoType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Detects JPEG, PNG or WebP from the file's first bytes. The browser's
 * declared content type is not trusted.
 */
export function sniffImageType(bytes: Uint8Array): PhotoType | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  // "RIFF" .... "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

export const photoExtension: Record<PhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
