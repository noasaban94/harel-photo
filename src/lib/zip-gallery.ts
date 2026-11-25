import JSZip from "jszip";
import telAvivSunset from "@/assets/sample-tel-aviv-sunset.jpg";
import galileeMorning from "@/assets/sample-galilee-morning.jpg";
import jerusalemAlley from "@/assets/sample-jerusalem-alley.jpg";
import desertStargaze from "@/assets/sample-desert-stargaze.jpg";

export interface GalleryImage {
  id: string;
  name: string;
  path: string;
  folder: string;
  url: string;
  date: Date;
  size: number;
}

export type MemoryTheme = "classic" | "cinema" | "postcard";

export interface MemoryAlbum {
  id: string;
  title: string;
  subtitle: string;
  theme: MemoryTheme;
  images: GalleryImage[];
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export function isSupportedImagePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.endsWith("/")) return false;
  const segments = normalized.split("/");
  if (segments.some((part) => part === "__MACOSX" || part.startsWith("."))) {
    return false;
  }
  const filename = segments[segments.length - 1] ?? "";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) return false;
  const ext = filename.slice(dotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function cleanDisplayName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const filename = normalized.split("/").pop() ?? normalized;
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || filename;
}

function extractFolderName(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 1) return "אלבום ראשי";
  return parts[parts.length - 2] ?? "אלבום ראשי";
}

function mimeFromPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".avif") return "image/avif";
  return "image/jpeg";
}

export async function extractImagesFromZip(file: File): Promise<GalleryImage[]> {
  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip" && file.type !== "application/x-zip-compressed" && file.type !== "") {
    throw new Error("יש לבחור קובץ בפורמט ZIP בלבד.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("לא ניתן לקרוא את קובץ ה-ZIP. ודאו שהקובץ תקין ואינו פגום.");
  }

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && isSupportedImagePath(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  if (entries.length === 0) {
    throw new Error("לא נמצאו תמונות נתמכות (JPG, PNG, WEBP, GIF) בתוך קובץ ה-ZIP.");
  }

  const images: GalleryImage[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry) continue;
    const rawBlob = await entry.async("blob");
    const typedBlob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type: mimeFromPath(entry.name) });
    images.push({
      id: `${i}-${entry.name}`,
      name: cleanDisplayName(entry.name),
      path: entry.name,
      folder: extractFolderName(entry.name),
      url: URL.createObjectURL(typedBlob),
      date: entry.date,
      size: typedBlob.size,
    });
  }

  return images;
}

export function revokeGalleryUrls(images: GalleryImage[]): void {
  for (const img of images) {
    if (img.url.startsWith("blob:")) {
      URL.revokeObjectURL(img.url);
    }
  }
}

export function generateMemories(images: GalleryImage[]): MemoryAlbum[] {
  if (images.length === 0) return [];
  const memories: MemoryAlbum[] = [];

  const highlightCount = Math.min(images.length, 6);
  const step = Math.max(1, Math.floor(images.length / highlightCount));
  const highlights: GalleryImage[] = [];
  for (let i = 0; i < images.length && highlights.length < highlightCount; i += step) {
    const img = images[i];
    if (img) highlights.push(img);
  }

  memories.push({
    id: "highlights",
    title: "רגעים נבחרים מהאלבום",
    subtitle: `${highlights.length} תמונות מרכזיות שנבחרו אוטומטית`,
    theme: "classic",
    images: highlights,
  });

  const byFolder = new Map<string, GalleryImage[]>();
  for (const img of images) {
    const list = byFolder.get(img.folder) ?? [];
    list.push(img);
    byFolder.set(img.folder, list);
  }

  if (byFolder.size > 1) {
    let folderIndex = 0;
    for (const [folder, folderImages] of byFolder.entries()) {
      const theme: MemoryTheme = folderIndex % 2 === 0 ? "postcard" : "cinema";
      memories.push({
        id: `folder-${folderIndex}`,
        title: `זיכרונות מ-${folder}`,
        subtitle: `${folderImages.length} תמונות בתיקייה`,
        theme,
        images: folderImages,
      });
      folderIndex += 1;
    }
  } else if (images.length >= 2) {
    const reversed = [...images].reverse().slice(0, Math.min(images.length, 5));
    memories.push({
      id: "cinema-reel",
      title: "מסע אחורה בזמן",
      subtitle: `${reversed.length} תמונות בסדר הפוך`,
      theme: "cinema",
      images: reversed,
    });
  }

  return memories;
}

const RANDOM_TITLES = [
  "רגעים של אור",
  "אוסף זיכרונות אישי",
  "ימים ששווה לשמור",
  "סיפור בתמונות",
  "מבט לאחור בחיוך",
];

export function createCustomMemory(
  images: GalleryImage[],
  customTitle: string,
  theme: MemoryTheme,
  seedIndex: number,
): MemoryAlbum {
  const shuffled = [...images].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(images.length, 6));
  const fallbackTitle = RANDOM_TITLES[seedIndex % RANDOM_TITLES.length] ?? "זיכרון חדש";
  const title = customTitle.trim() || fallbackTitle;
  return {
    id: `custom-${Date.now()}-${seedIndex}`,
    title,
    subtitle: `${picked.length} תמונות שנבחרו לזיכרון`,
    theme,
    images: picked,
  };
}

export async function createSampleZipFile(): Promise<File> {
  const zip = new JSZip();
  const samples = [
    { path: "חופשה בצפון/בוקר בגליל.jpg", src: galileeMorning },
    { path: "עיר וחוף/שקיעה בתל אביב.jpg", src: telAvivSunset },
    { path: "עיר וחוף/סמטה בירושלים.jpg", src: jerusalemAlley },
    { path: "מדבר ודרום/דמדומים בנגב.jpg", src: desertStargaze },
  ];

  for (const item of samples) {
    const response = await fetch(item.src);
    const blob = await response.blob();
    zip.file(item.path, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  return new File([content], "אלבום-זיכרונות-לדוגמה.zip", { type: "application/zip" });
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("לא ניתן לטעון תמונה לייצוא."));
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function exportMemoryCollage(memory: MemoryAlbum): Promise<void> {
  const selected = memory.images.slice(0, 4);
  if (selected.length === 0) return;

  const loaded = await Promise.all(selected.map((item) => loadHtmlImage(item.url)));
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isCinema = memory.theme === "cinema";
  ctx.fillStyle = isCinema ? "#181d26" : "#faf7f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 48;
  const headerHeight = 130;
  const gridW = canvas.width - pad * 2;
  const gridH = canvas.height - pad * 2 - headerHeight;
  const gap = 18;

  if (loaded.length === 1 && loaded[0]) {
    drawCoverImage(ctx, loaded[0], pad, pad, gridW, gridH);
  } else if (loaded.length === 2 && loaded[0] && loaded[1]) {
    const halfW = (gridW - gap) / 2;
    drawCoverImage(ctx, loaded[0], pad, pad, halfW, gridH);
    drawCoverImage(ctx, loaded[1], pad + halfW + gap, pad, halfW, gridH);
  } else {
    const cellW = (gridW - gap) / 2;
    const cellH = (gridH - gap) / 2;
    loaded.forEach((img, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = pad + col * (cellW + gap);
      const y = pad + row * (cellH + gap);
      drawCoverImage(ctx, img, x, y, cellW, cellH);
    });
  }

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = isCinema ? "#f7f4ee" : "#221d18";
  ctx.font = '700 44px "Frank Ruhl Libre", Georgia, serif';
  ctx.fillText(memory.title, canvas.width - pad, canvas.height - 82);

  ctx.fillStyle = isCinema ? "#b8c0ce" : "#6c6258";
  ctx.font = '400 24px "Heebo", sans-serif';
  ctx.fillText(memory.subtitle, canvas.width - pad, canvas.height - 42);

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${memory.title.replace(/\s+/g, "-")}.png`;
  link.click();
}