export const DEFAULT_DRIVE_FOLDER_ID = "1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja";
export const DEFAULT_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/u/0/folders/1Hn0QBnq87FWTJsd-FuqNDcfe1KIQOHja";

export interface DriveImageDTO {
  id: string;
  name: string;
  path: string;
  folder: string;
  url: string;
  dateIso: string;
  size: number;
}

export interface DriveFolderResult {
  folderName: string;
  folderId: string;
  subfolderCount: number;
  images: DriveImageDTO[];
}

export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) return folderMatch[1];

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch?.[1]) return queryMatch[1];

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}