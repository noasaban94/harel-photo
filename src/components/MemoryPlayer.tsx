import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Pause, Play, X } from "lucide-react";
import { exportMemoryCollage, type MemoryAlbum } from "@/lib/zip-gallery";

interface MemoryPlayerProps {
  memory: MemoryAlbum;
  onClose: () => void;
}

export function MemoryPlayer({ memory, onClose }: MemoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const current = memory.images[index];

  useEffect(() => {
    if (!isPlaying || memory.images.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % memory.images.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [isPlaying, memory.images.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === " ") {
        event.preventDefault();
        setIsPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportMemoryCollage(memory);
    } finally {
      setIsExporting(false);
    }
  }

  if (!current) return null;

  const frameStyle =
    memory.theme === "postcard"
      ? "bg-card p-3 pb-5 sm:p-5 sm:pb-7 text-foreground"
      : "bg-overlay text-overlay-foreground";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`מצגת זיכרון: ${memory.title}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/92 p-4 backdrop-blur-md sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ${frameStyle}`}
      >
        <div className="flex gap-1.5 px-4 pt-4">
          {memory.images.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`עבור לתמונה ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === index
                  ? "bg-primary"
                  : memory.theme === "postcard"
                    ? "bg-border"
                    : "bg-overlay-foreground/25"
              }`}
            />
          ))}
        </div>

        <div className="relative mt-3 aspect-[16/10] w-full overflow-hidden rounded-xl bg-overlay">
          <img
            key={current.id}
            src={current.url}
            alt={current.name}
            className="animate-memory-drift h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-overlay/85 via-overlay/35 to-transparent p-5 text-overlay-foreground sm:p-7">
            <h3 className="text-2xl font-bold sm:text-3xl">{memory.title}</h3>
            <p className="mt-1 text-sm text-overlay-foreground/80">
              {current.name} · {index + 1} / {memory.images.length}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "השהה" : "נגן"}
            </button>

            {memory.images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="שקופית קודמת"
                  onClick={() =>
                    setIndex((prev) => (prev - 1 + memory.images.length) % memory.images.length)
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-secondary/40 transition-colors hover:bg-secondary/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="שקופית הבאה"
                  onClick={() => setIndex((prev) => (prev + 1) % memory.images.length)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-secondary/40 transition-colors hover:bg-secondary/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "מכין גלויה..." : "הורד גלוית זיכרון"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="סגור נגן זיכרונות"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-secondary/40 transition-colors hover:bg-secondary/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}