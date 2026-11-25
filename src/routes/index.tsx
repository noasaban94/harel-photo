import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderUp, Images, Sparkles } from "lucide-react";
import {
  createSampleZipFile,
  extractImagesFromZip,
  generateMemories,
  revokeGalleryUrls,
  type GalleryImage,
  type MemoryAlbum,
} from "@/lib/zip-gallery";
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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [memories, setMemories] = useState<MemoryAlbum[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("gallery");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef<GalleryImage[]>([]);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => revokeGalleryUrls(imagesRef.current);
  }, []);

  async function handleZipFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const extracted = await extractImagesFromZip(file);
      revokeGalleryUrls(imagesRef.current);
      setImages(extracted);
      setMemories(generateMemories(extracted));
      setArchiveName(file.name);
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
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {images.length === 0 ? (
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
