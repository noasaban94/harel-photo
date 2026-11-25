import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  extractDriveFolderId,
  type DriveFolderResult,
  type DriveImageDTO,
} from "@/lib/google-drive";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const IGNORED_FOLDERS = new Set(["_PAlbTN", "__MACOSX"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"]);
const PARENT_BATCH_SIZE = 15;
const MAX_FOLDERS = 250;

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

interface DriveListResponse {
  files?: DriveFileItem[];
  nextPageToken?: string;
}

function isImageFile(file: DriveFileItem): boolean {
  if (file.mimeType.startsWith("image/")) return true;
  const dot = file.name.lastIndexOf(".");
  if (dot <= 0) return false;
  return IMAGE_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

function cleanDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || filename;
}

async function fetchDriveJson<T>(
  path: string,
  headers: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Google Drive gateway request failed [${response.status}]: ${errorBody}`);
    throw new Error(`שגיאה בגישה ל-Google Drive (${response.status}): ${errorBody.slice(0, 180)}`);
  }
  return (await response.json()) as T;
}

async function listChildrenBatch(
  parentIds: string[],
  headers: Record<string, string>,
): Promise<DriveFileItem[]> {
  const parentClause = parentIds.map((id) => `'${id.replace(/'/g, "\\'")}' in parents`).join(" or ");
  const query = `(${parentClause}) and trashed = false`;
  const results: DriveFileItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)",
      pageSize: "1000",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const page = await fetchDriveJson<DriveListResponse>(`/files?${params.toString()}`, headers);
    if (page.files) results.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return results;
}

export const listDriveFolderImages = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ folderInput: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<DriveFolderResult> => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const driveApiKey = process.env["GOOGLE_DRIVE_API_KEY"];
    if (!lovableApiKey) throw new Error("מפתח המערכת חסר בשרת.");
    if (!driveApiKey) throw new Error("חיבור Google Drive אינו זמין כרגע.");

    const folderId = extractDriveFolderId(data.folderInput);
    if (!folderId) {
      throw new Error("קישור או מזהה התיקייה של Google Drive אינו תקין.");
    }

    const headers = {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": driveApiKey,
    };

    const rootMeta = await fetchDriveJson<DriveFileItem>(
      `/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true`,
      headers,
    );

    if (rootMeta.mimeType !== FOLDER_MIME) {
      throw new Error("הקישור שהוזן אינו תיקיית Google Drive.");
    }

    const folderInfo = new Map<string, { path: string; topFolder: string }>();
    folderInfo.set(rootMeta.id, { path: rootMeta.name, topFolder: "תיקייה ראשית" });

    const visited = new Set<string>([rootMeta.id]);
    let currentWave: string[] = [rootMeta.id];
    const images: DriveImageDTO[] = [];
    let subfolderCount = 0;

    while (currentWave.length > 0 && visited.size <= MAX_FOLDERS) {
      const batches: string[][] = [];
      for (let i = 0; i < currentWave.length; i += PARENT_BATCH_SIZE) {
        batches.push(currentWave.slice(i, i + PARENT_BATCH_SIZE));
      }

      const batchResults = await Promise.all(
        batches.map((batch) => listChildrenBatch(batch, headers)),
      );

      const nextWave: string[] = [];
      for (const items of batchResults) {
        for (const item of items) {
          const parentId = item.parents?.find((pid) => folderInfo.has(pid));
          const parentMeta = parentId ? folderInfo.get(parentId) : undefined;
          if (!parentMeta) continue;

          if (item.mimeType === FOLDER_MIME) {
            if (IGNORED_FOLDERS.has(item.name) || item.name.startsWith(".")) continue;
            if (visited.has(item.id) || visited.size >= MAX_FOLDERS) continue;
            visited.add(item.id);
            subfolderCount += 1;
            const topFolder =
              parentId === rootMeta.id ? item.name : parentMeta.topFolder;
            folderInfo.set(item.id, {
              path: `${parentMeta.path}/${item.name}`,
              topFolder,
            });
            nextWave.push(item.id);
          } else if (isImageFile(item)) {
            images.push({
              id: item.id,
              name: cleanDisplayName(item.name),
              path: `${parentMeta.path}/${item.name}`,
              folder: parentMeta.topFolder,
              url: `/api/drive-image/${encodeURIComponent(item.id)}`,
              dateIso: item.modifiedTime ?? new Date().toISOString(),
              size: Number(item.size ?? 0),
            });
          }
        }
      }

      currentWave = nextWave;
    }

    images.sort((a, b) => {
      const folderCmp = a.folder.localeCompare(b.folder, "he");
      if (folderCmp !== 0) return folderCmp;
      return a.name.localeCompare(b.name, "he");
    });

    return {
      folderName: rootMeta.name,
      folderId: rootMeta.id,
      subfolderCount,
      images,
    };
  });