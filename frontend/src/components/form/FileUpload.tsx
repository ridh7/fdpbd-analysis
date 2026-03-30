import { useRef, useEffect } from "react";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the input value when file is cleared so the same file can be re-selected
  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [file]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith(".txt")) {
      onFileChange(selected);
    } else {
      onFileChange(null);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded border border-(--border-input) bg-(--bg-tertiary) p-3">
      <label className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        Choose File
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </label>
      <span className="text-sm text-(--text-secondary)">
        {file ? file.name : "No file selected"}
      </span>
    </div>
  );
}
