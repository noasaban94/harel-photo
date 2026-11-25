import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FolderSync, FolderUp, Images, Loader2, Sparkles } from "lucide-react";
import {
  createSampleZipFile,
  extractImagesFromZip,
  generateMemories,
  revokeGalleryUrls,
  type GalleryImage,
  type MemoryAlbum,
} from "@/lib/zip-gallery";
import { DEFAULT_DRIVE_FOLDER_URL } from "@/lib/google-drive";
import { listDriveFolderImages } from "@/lib/google-drive.functions";
import { ZipUploadZone } from "@/components/ZipUploadZone";
import { GalleryGrid } from "@/components/GalleryGrid";
import { MemoryGenerator } from "@/components/MemoryGenerator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "גלריית תמונות ומחולל זיכרונות מקובץ ZIP" },
      {
        name: "description",
        content: "חלצו תמונות מקובץ ZIP בדפדפן, צפו בגלריה מעוצבת וצרו מצגות וגלויות זיכרון.",
      },
      { property: "og:title", content: "גלריית תמונות ומחולל זיכרונות מקובץ ZIP" },
      {
        property: "og:description",
        content: "חלצו תמונות מקובץ ZIP בדפדפן, צפו בגלריה מעוצבת וצרו מצגות וגלויות זיכרון.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type ActiveView = "gallery" | "memories";

function Index() {
  const [archiveName, setArchiveName] = useState<string | null>(null);
  const [subfolderCount, setSubfolderCount] = useState<number>(0);
  const [driveInput, setDriveInput] = useState(DEFAULT_DRIVE_FOLDER_URL);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [memories, setMemories] = useState<MemoryAlbum[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("gallery");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef<GalleryImage[]>([]);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const loadDriveFn = useServerFn(listDriveFolderImages);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => revokeGalleryUrls(imagesRef.current);
  }, []);

  const handleLoadDriveFolder = useCallback(
    async (folderUrl: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await loadDriveFn({ data: { folderInput: folderUrl } });
        if (result.images.length === 0) {
          throw new Error("לא נמצאו תמונות בתיקיית Google Drive או בתתי-התיקיות שלה.");
        }
        const mapped: GalleryImage[] = result.images.map((item) => ({
          id: item.id,
          name: item.name,
          path: item.path,
          folder: item.folder,
          url: item.url,
          date: new Date(item.dateIso),
          size: item.size,
        }));
        revokeGalleryUrls(imagesRef.current);
        setImages(mapped);
        setMemories(generateMemories(mapped));
        setArchiveName(`Google Drive · ${result.folderName}`);
        setSubfolderCount(result.subfolderCount);
        setActiveView("gallery");
        setShowDrivePicker(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "לא ניתן לטעון תמונות מ-Google Drive.");
      } finally {
        setIsLoading(false);
      }
    },
    [loadDriveFn],
  );

  useEffect(() => {
    void handleLoadDriveFolder(DEFAULT_DRIVE_FOLDER_URL);
  }, [handleLoadDriveFolder]);

  async function handleZipFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const extracted = await extractImagesFromZip(file);
      revokeGalleryUrls(imagesRef.current);
      setImages(extracted);
      setMemories(generateMemories(extracted));
      setArchiveName(file.name);
      setSubfolderCount(0);
      setActiveView("gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה בעת פתיחת קובץ ה-ZIP.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoadSample() {
    setIsLoading(true);
    setError(null);
    try {
      const sampleZip = await createSampleZipFile();
      await handleZipFile(sampleZip);
    } catch {
      setError("לא ניתן לטעון את אלבום הדוגמה כרגע.");
      setIsLoading(false);
    }
  }

  function handleDriveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!driveInput.trim() || isLoading) return;
    void handleLoadDriveFolder(driveInput);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              גלריית תמונות ומחולל זיכרונות
            </h1>
            {archiveName && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {archiveName} · {images.length} תמונות
                {subfolderCount > 0 ? ` · ${subfolderCount} תתי-תיקיות` : ""}
              </p>
            )}
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <nav
                aria-label="תצוגות האפליקציה"
                className="inline-flex rounded-xl border border-border bg-surface-subtle p-1"
              >
                <button
                  type="button"
                  onClick={() => setActiveView("gallery")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeView === "gallery"
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Images className="h-4 w-4" />
                  גלריה ({images.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("memories")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeView === "memories"
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  מחולל זיכרונות ({memories.length})
                </button>
              </nav>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowDrivePicker((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <FolderSync className="h-4 w-4 text-primary" />
                תיקיית Drive
              </button>

              <input
                ref={replaceInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0];
                  if (nextFile) void handleZipFile(nextFile);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <FolderUp className="h-4 w-4 text-primary" />
                העלה ZIP חדש
              </button>
            </div>
          )}
        </div>

        {showDrivePicker && (
          <form
            onSubmit={handleDriveSubmit}
            className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-6 lg:px-8"
          >
            <input
              type="text"
              dir="ltr"
              value={driveInput}
              onChange={(e) => setDriveInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground focus:outline-2 focus:outline-ring"
            />
            <button
              type="submit"
              disabled={isLoading || !driveInput.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />}
              סרוק תיקייה
            </button>
          </form>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {isLoading && images.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">סורק תיקיות ותתי-תיקיות ב-Google Drive...</h2>
            <p className="mt-2 text-sm text-muted-foreground">שולף את כל התמונות מהתיקייה שלך ומכין את הגלריה והזיכרונות.</p>
          </div>
        ) : images.length === 0 ? (
          <div className="space-y-10">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-accent px-3.5 py-1 text-xs font-medium text-accent-foreground">
                פרטי ומקומי · ישירות מקובץ ZIP
              </span>
              <h2 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                הפכו כל ארכיון תמונות לגלריה חיה ולזיכרונות מעוצבים
              </h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                העלו קובץ ZIP מהמחשב או מהטלפון כדי לצפות בתמונות באיכות מלאה, להפעיל מצגות זיכרון
                אוטומטיות ולהוריד גלויות קולאז׳ בעברית.
              </p>
            </div>

            <ZipUploadZone
              isLoading={isLoading}
              error={error}
              onFileSelected={(file) => void handleZipFile(file)}
              onLoadSample={() => void handleLoadSample()}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {error}
              </div>
            )}

            {activeView === "gallery" ? (
              <GalleryGrid images={images} />
            ) : (
              <MemoryGenerator
                images={images}
                memories={memories}
                onAddMemory={(next) => setMemories((prev) => [next, ...prev])}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
