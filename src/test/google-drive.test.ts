import { describe, expect, it } from "vitest";
import { DEFAULT_DRIVE_FOLDER_ID, extractDriveFolderId } from "@/lib/google-drive";

describe("extractDriveFolderId", () => {
  it("extracts folder ID from standard Google Drive folder URLs", () => {
    expect(
      extractDriveFolderId(
        "https://drive.google.com/drive/u/0/folders/1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja",
      ),
    ).toBe(DEFAULT_DRIVE_FOLDER_ID);
    expect(
      extractDriveFolderId(
        "https://drive.google.com/drive/folders/1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja?usp=sharing",
      ),
    ).toBe(DEFAULT_DRIVE_FOLDER_ID);
    expect(
      extractDriveFolderId(
        "https://drive.google.com/open?id=1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja",
      ),
    ).toBe(DEFAULT_DRIVE_FOLDER_ID);
  });

  it("accepts raw folder IDs and rejects empty or invalid input", () => {
    expect(extractDriveFolderId("1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja")).toBe(
      DEFAULT_DRIVE_FOLDER_ID,
    );
    expect(extractDriveFolderId("")).toBeNull();
    expect(extractDriveFolderId("https://example.com/not-drive")).toBeNull();
  });
});