import * as React from "react";
import { tokens } from "@/styles/tokens";
import { Upload, X, FileText } from "lucide-react";

interface ExistingFile {
  fileId: string;
  fileName: string;
  url?: string;
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ fileId: string; fileName: string }>;
  onDelete?: (fileId: string) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  existingFiles?: ExistingFile[];
  disabled?: boolean;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      onUpload,
      onDelete,
      accept,
      maxSizeMB = 5,
      multiple = false,
      existingFiles = [],
      disabled = false,
    },
    ref,
  ) => {
    const [files, setFiles] = React.useState<ExistingFile[]>(existingFiles);
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setFiles(existingFiles);
    }, [existingFiles]);

    const handleFiles = React.useCallback(
      async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        setError(null);

        const toProcess = multiple ? Array.from(fileList) : [fileList[0]];

        for (const file of toProcess) {
          if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`"${file.name}" exceeds ${maxSizeMB} MB limit`);
            continue;
          }
          setUploading(true);
          try {
            const result = await onUpload(file);
            setFiles((prev) => [...prev, result]);
          } catch {
            setError(`Failed to upload "${file.name}"`);
          } finally {
            setUploading(false);
          }
        }

        if (inputRef.current) inputRef.current.value = "";
      },
      [maxSizeMB, multiple, onUpload],
    );

    const handleRemove = React.useCallback(
      (fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
        onDelete?.(fileId);
      },
      [onDelete],
    );

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) handleFiles(e.dataTransfer.files);
      },
      [disabled, handleFiles],
    );

    return (
      <div ref={ref} className="flex flex-col gap-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
            disabled
              ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
              : "cursor-pointer border-neutral-300 bg-white hover:border-neutral-400"
          }`}
        >
          <Upload className="h-6 w-6 text-neutral-400" />
          <p className="text-sm text-neutral-600">
            {uploading ? "Uploading…" : "Click or drag files here"}
          </p>
          <p className="text-xs text-neutral-400">
            Max {maxSizeMB} MB {accept ? `· ${accept}` : ""}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* File list */}
        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((f) => (
              <li
                key={f.fileId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0" style={{ color: tokens.brand.primary }} />
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                      style={{ color: tokens.brand.primary }}
                    >
                      {f.fileName}
                    </a>
                  ) : (
                    <span className="truncate">{f.fileName}</span>
                  )}
                </span>
                {onDelete && !disabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${f.fileName}`}
                    onClick={() => handleRemove(f.fileId)}
                    className="ml-2 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
FileUpload.displayName = "FileUpload";

export { FileUpload };
export type { FileUploadProps, ExistingFile };
