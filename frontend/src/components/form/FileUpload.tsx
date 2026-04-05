import { useRef, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { InfoTooltip } from "../ui/InfoTooltip";
import { validateDataFile } from "../../lib/validation";
import { UploadIcon } from "../ui/Icons";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset the input value when file is cleared so the same file can be re-selected
  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = "";
    }
    if (!file) {
      setError(null);
    }
  }, [file]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      onFileChange(null);
      return;
    }

    if (!selected.name.endsWith(".txt")) {
      setError("Only .txt files are supported.");
      onFileChange(null);
      return;
    }

    const validationError = await validateDataFile(selected);
    if (validationError) {
      setError(validationError);
      onFileChange(null);
      return;
    }

    setError(null);
    onFileChange(selected);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        <span className="flex-1 truncate text-sm text-(--text-secondary)">
          {file ? file.name : "No file selected (.txt)"}
        </span>
        <InfoTooltip>
          <p className="mb-2 font-medium text-(--text-primary)">Expected file format</p>
          <p className="mb-2 text-(--text-secondary)">
            Whitespace-delimited{" "}
            <code className="rounded bg-(--bg-tertiary) px-1">.txt</code> file with 4
            numeric columns, no headers:
          </p>
          <div className="rounded bg-(--bg-tertiary) p-2 font-mono text-[10px] leading-relaxed text-(--text-secondary)">
            <div>
              V_in&nbsp;&nbsp;&nbsp;&nbsp;V_out&nbsp;&nbsp;&nbsp;&nbsp;Freq&nbsp;&nbsp;&nbsp;&nbsp;V_sum
            </div>
            <div className="mt-1 text-(--text-muted)">
              9.95e-04&ensp;1.99e-05&ensp;1.00e+02&ensp;1.80e-01
              <br />
              9.94e-04&ensp;2.28e-05&ensp;1.15e+02&ensp;1.80e-01
              <br />
              ...
            </div>
          </div>
          <p className="mt-2 text-(--text-muted)">Minimum 2 data rows required.</p>
        </InfoTooltip>
      </div>
      {error && <p className="text-xs text-(--status-error-text)">{error}</p>}
    </div>
  );
}
