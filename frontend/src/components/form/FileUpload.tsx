import { useRef, useEffect } from "react";
import { Button } from "../ui/Button";

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
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <span className="text-sm text-(--text-secondary)">
        {file ? file.name : "No file selected (.txt)"}
      </span>
    </div>
  );
}
