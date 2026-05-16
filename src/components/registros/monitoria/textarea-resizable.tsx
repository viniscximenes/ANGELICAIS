"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconGripHorizontal } from "@tabler/icons-react";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialHeight?: number;
}

export function TextareaResizable({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  initialHeight = 180,
}: Props) {
  const [height, setHeight] = useState(initialHeight);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(initialHeight);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
    },
    [disabled, height],
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientY - startY.current;
      const newHeight = Math.max(120, startHeight.current + delta);
      setHeight(newHeight);
    }

    function handleMouseUp() {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="elevation-2 ds-body block w-full rounded-md rounded-b-none px-4 py-3"
        style={{
          border: "1px solid var(--border)",
          borderBottom: "none",
          height: `${height}px`,
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          resize: "none",
        }}
      />

      <div
        onMouseDown={handleMouseDown}
        className={`elevation-2 flex items-center justify-center rounded-b-md transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-ns-resize hover:bg-[var(--border)]"
        }`}
        style={{
          border: "1px solid var(--border)",
          borderTop: "1px dashed var(--border)",
          height: "14px",
          userSelect: "none",
        }}
        role="separator"
        aria-label="Arraste para redimensionar"
        aria-orientation="horizontal"
      >
        <IconGripHorizontal
          size={14}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
