import { useState, type FormEvent } from "react";
import { Download, Play, Sparkles } from "lucide-react";
import {
  createCustomMemory,
  exportMemoryCollage,
  type GalleryImage,
  type MemoryAlbum,
  type MemoryTheme,
} from "@/lib/zip-gallery";
import { MemoryPlayer } from "@/components/MemoryPlayer";

interface MemoryGeneratorProps {
  images: GalleryImage[];
  memories: MemoryAlbum[];
  onAddMemory: (memory: MemoryAlbum) => void;
}

const THEME_OPTIONS: { value: MemoryTheme; label: string }[] = [
  { value: "classic", label: "קלאסי" },
  { value: "cinema", label: "קולנוע" },
  { value: "postcard", label: "גלויה" },
];

export function MemoryGenerator({ images, memories, onAddMemory }: MemoryGeneratorProps) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<MemoryTheme>("classic");
  const [activeMemory, setActiveMemory] = useState<MemoryAlbum | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (images.length === 0) return;
    const created = createCustomMemory(images, title, theme, memories.length);
    onAddMemory(created);
    setTitle("");
    setActiveMemory(created);
  }

  async function handleExportCard(memory: MemoryAlbum) {
    setExportingId(memory.id);
    try {
      await exportMemoryCollage(memory);
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleGenerate}
        className="gallery-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-end sm:p-6"
      >
        <div className="flex-1">
          <label htmlFor="memory-title" className="mb-1.5 block text-sm font-medium text-foreground">
            כותרת לזיכרון חדש (אופציונלי)
          </label>
          <input
            id="memory-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: סוף שבוע בגליל"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">סגנון מצגת וגלויה</span>
          <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-1">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  theme === option.value
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4" />
          צור זיכרון חדש
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memories.map((memory) => {
          const cover = memory.images[0];
          const previewStrip = memory.images.slice(1, 4);
          return (
            <article
              key={memory.id}
              className="gallery-card flex flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-0.5"
            >
              <button
                type="button"
                onClick={() => setActiveMemory(memory)}
                className="group relative aspect-[16/10] w-full overflow-hidden bg-muted text-right"
              >
                {cover && (
                  <img
                    src={cover.url}
                    alt={memory.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-overlay/80 via-overlay/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-overlay-foreground">
                  <h3 className="text-xl font-bold leading-snug">{memory.title}</h3>
                  <p className="mt-0.5 text-xs text-overlay-foreground/80">{memory.subtitle}</p>
                </div>
              </button>

              {previewStrip.length > 0 && (
                <div className="grid grid-cols-3 gap-1 bg-surface-subtle p-1.5">
                  {previewStrip.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.name}
                      className="aspect-[4/3] w-full rounded-md object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setActiveMemory(memory)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Play className="h-4 w-4" />
                  הפעל מצגת
                </button>

                <button
                  type="button"
                  disabled={exportingId === memory.id}
                  onClick={() => handleExportCard(memory)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exportingId === memory.id ? "מייצא..." : "גלויה"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {activeMemory && (
        <MemoryPlayer memory={activeMemory} onClose={() => setActiveMemory(null)} />
      )}
    </div>
  );
}