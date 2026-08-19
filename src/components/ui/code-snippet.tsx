import React from "react";
import styles from "./code-snippet.module.css";

interface CodeSnippetViewerProps {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}

export function CodeSnippetViewer({
  code,
  filename,
  language,
  className,
}: CodeSnippetViewerProps) {
  // Simple diff parser
  const lines = code.split("\n");

  return (
    <div className={`${styles.container} ${className || ""}`.trim()}>
      {(filename || language) && (
        <div className={styles.header}>
          <span>{filename || "snippet"}</span>
          {language && <span>{language}</span>}
        </div>
      )}
      <div className={styles.codeScroll}>
        <code className={styles.codeBlock}>
          {lines.map((line, index) => {
            // Determine line type for basic diff highlighting
            let lineTypeClass = styles.lineNormal;
            let displayLine = line;

            if (line.startsWith("+")) {
              lineTypeClass = styles.lineAddition;
              displayLine = line.substring(1);
            } else if (line.startsWith("-")) {
              lineTypeClass = styles.lineDeletion;
              displayLine = line.substring(1);
            } else if (line.startsWith(" ")) {
              displayLine = line.substring(1);
            }

            return (
              <div key={index} className={`${styles.line} ${lineTypeClass}`}>
                {displayLine}
              </div>
            );
          })}
        </code>
      </div>
    </div>
  );
}
