import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FolderArchive, Sparkles, Upload } from "lucide-react";

interface ZipUploadZoneProps {
  isLoading: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
}

export function ZipUploadZone({
  isLoading,
  error,
  onFileSelected,
  onLoadSample,
}: ZipUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="העלאת קובץ ZIP של תמונות"
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isLoading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`gallery-card flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all sm:px-12 sm:py-20 ${
          isDragging
            ? "border-primary bg-accent/60 scale-[1.01]"
            : "border-border hover:border-primary/60 hover:bg-surface-subtle/70"
        } ${isLoading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
          {isLoading ? (
            <FolderArchive className="h-8 w-8 animate-pulse" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          {isLoading ? "מחלץ תמונות מקובץ ה-ZIP..." : "גררו לכאן קובץ ZIP או לחצו לבחירה"}
        </h2>

        <p className="mt-2.5 max-w-md text-sm text-muted-foreground sm:text-base">
          כל התמונות נפתחות באופן פרטי ומקומי בדפדפן שלכם — ללא העלאה לשרת חיצוני. תומך ב-JPG, PNG,
          WEBP ו-GIF.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <FolderArchive className="h-4 w-4" />
            בחירת קובץ ZIP
          </span>

          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onLoadSample();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            טען קובץ ZIP לדוגמה
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}
    </section>
  );
}