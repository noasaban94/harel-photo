import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import {
  extractImagesFromZip,
  generateMemories,
  isSupportedImagePath,
} from "@/lib/zip-gallery";

describe("isSupportedImagePath", () => {
  it("accepts standard image extensions and rejects metadata or non-images", () => {
    expect(isSupportedImagePath("vacation/sunset.jpg")).toBe(true);
    expect(isSupportedImagePath("IMG_001.PNG")).toBe(true);
    expect(isSupportedImagePath("gallery/photo.webp")).toBe(true);
    expect(isSupportedImagePath("__MACOSX/vacation/._sunset.jpg")).toBe(false);
    expect(isSupportedImagePath(".DS_Store")).toBe(false);
    expect(isSupportedImagePath("notes/readme.txt")).toBe(false);
    expect(isSupportedImagePath("folder/")).toBe(false);
  });
});

describe("extractImagesFromZip and generateMemories", () => {
  it("extracts supported images and builds highlight + folder memories", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock");
    const zip = new JSZip();
    zip.file("צפון/גליל.jpg", new Uint8Array([255, 216, 255]));
    zip.file("דרום/נגב.png", new Uint8Array([137, 80, 78, 71]));
    zip.file("__MACOSX/צפון/._גליל.jpg", new Uint8Array([0, 1]));
    zip.file("readme.txt", "ignored");

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const file = new File([buffer], "trip.zip", { type: "application/zip" });

    const images = await extractImagesFromZip(file);
    expect(images).toHaveLength(2);
    expect(images.map((img) => img.folder)).toEqual(["דרום", "צפון"]);

    const memories = generateMemories(images);
    expect(memories).toHaveLength(3);
    expect(memories[0]?.title).toBe("רגעים נבחרים מהאלבום");

    createObjectURL.mockRestore();
  });

  it("rejects a ZIP archive that contains no supported images", async () => {
    const zip = new JSZip();
    zip.file("notes.txt", "hello");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const file = new File([buffer], "empty.zip", { type: "application/zip" });

    await expect(extractImagesFromZip(file)).rejects.toThrow("לא נמצאו תמונות נתמכות");
  });
});