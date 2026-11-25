import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Folder, X } from "lucide-react";
import type { GalleryImage } from "@/lib/zip-gallery";

interface GalleryGridProps {
  images: GalleryImage[];
}

export function GalleryGrid({ images }: GalleryGridProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const img of images) {
      counts.set(img.folder, (counts.get(img.folder) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [images]);

  const visibleImages = useMemo(() => {
    if (selectedFolder === "all") return images;
    return images.filter((img) => img.folder === selectedFolder);
  }, [images, selectedFolder]);

  useEffect(() => {
    setSelectedFolder("all");
    setActiveIndex(null);
  }, [images]);

  const activeImage = activeIndex !== null ? visibleImages[activeIndex] : undefined;

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev === null ? null : (prev + 1) % visibleImages.length));
      } else if (event.key === "ArrowRight") {
        setActiveIndex((prev) =>
          prev === null ? null : (prev - 1 + visibleImages.length) % visibleImages.length,
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, visibleImages.length]);

  return (
    <>
      {folderCounts.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="סינון לפי תיקייה">
          <button
            type="button"
            onClick={() => {
              setSelectedFolder("all");
              setActiveIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selectedFolder === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            הכל ({images.length})
          </button>
          {folderCounts.map(([folder, count]) => (
            <button
              key={folder}
              type="button"
              onClick={() => {
                setSelectedFolder(folder);
                setActiveIndex(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                selectedFolder === folder
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              {folder} ({count})
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleImages.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="gallery-card group overflow-hidden rounded-xl text-right transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-3.5 py-3">
              <span className="truncate text-sm font-medium text-foreground">{image.name}</span>
              <span className="shrink-0 rounded-md bg-surface-subtle px-2 py-0.5 text-xs text-muted-foreground">
                {image.folder}
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeImage && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeImage.name}
          onClick={() => setActiveIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/92 p-4 backdrop-blur-sm sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
          >
            <div className="mb-3 flex w-full items-center justify-between text-overlay-foreground">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold sm:text-xl">{activeImage.name}</h3>
                <p className="text-xs text-overlay-foreground/70">
                  תמונה {activeIndex + 1} מתוך {visibleImages.length} · {activeImage.path}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeImage.url}
                  download={`${activeImage.name}.jpg`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-overlay-foreground/15 text-overlay-foreground transition-colors hover:bg-overlay-foreground/25"
                  aria-label="הורד תמונה"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-overlay-foreground/15 text-overlay-foreground transition-colors hover:bg-overlay-foreground/25"
                  aria-label="סגור תצוגה"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex w-full items-center justify-center">
              {visibleImages.length > 1 && (
                <button
                  type="button"
                  aria-label="תמונה קודמת"
                  onClick={() =>
                    setActiveIndex((activeIndex - 1 + visibleImages.length) % visibleImages.length)
                  }
                  className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-overlay/70 text-overlay-foreground transition-colors hover:bg-overlay sm:right-4"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              <img
                src={activeImage.url}
                alt={activeImage.name}
                className="max-h-[76vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />

              {visibleImages.length > 1 && (
                <button
                  type="button"
                  aria-label="תמונה הבאה"
                  onClick={() => setActiveIndex((activeIndex + 1) % visibleImages.length)}
                  className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-overlay/70 text-overlay-foreground transition-colors hover:bg-overlay sm:left-4"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}