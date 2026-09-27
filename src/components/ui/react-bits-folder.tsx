"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./react-bits-folder.module.css";

interface ReactBitsFolderProps {
  color?: string;
  backColor?: string;
  paperColors?: [string, string, string];
  size?: number;
  items?: ReactNode[];
  open?: boolean;
  className?: string;
}

type FolderCssProperties = CSSProperties & {
  "--folder-color": string;
  "--folder-back-color": string;
  "--folder-paper-1": string;
  "--folder-paper-2": string;
  "--folder-paper-3": string;
  "--folder-scale": number;
};

/**
 * Folder do React Bits, adaptado para uso decorativo dentro de controles já
 * interativos. O estado aberto vem do elemento pai, evitando botão aninhado.
 */
export function ReactBitsFolder({
  color = "#5227ff",
  backColor = `color-mix(in srgb, ${color} 78%, #000 22%)`,
  paperColors = ["#e6e6e6", "#f2f2f2", "#ffffff"],
  size = 1,
  items = [],
  open = false,
  className,
}: ReactBitsFolderProps) {
  const papers = items.slice(0, 3);
  while (papers.length < 3) papers.push(null);

  const style: FolderCssProperties = {
    "--folder-color": color,
    "--folder-back-color": backColor,
    "--folder-paper-1": paperColors[0],
    "--folder-paper-2": paperColors[1],
    "--folder-paper-3": paperColors[2],
    "--folder-scale": size,
    width: `${100 * size}px`,
    height: `${112 * size}px`,
  };

  return (
    <div className={cn(styles.root, className)} style={style} aria-hidden="true">
      <div className={styles.stage}>
        <div className={cn(styles.folder, open && styles.open)}>
          <div className={styles.back}>
            {papers.map((item, index) => (
              <div key={index} className={cn(styles.paper, styles[`paper${index + 1}`])}>
                {item}
              </div>
            ))}
            <div className={styles.front} />
            <div className={cn(styles.front, styles.right)} />
          </div>
        </div>
      </div>
    </div>
  );
}
