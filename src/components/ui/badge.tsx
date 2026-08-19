import React from "react";
import styles from "./badge.module.css";

export type BadgeVariant =
  "critical" | "high" | "medium" | "low" | "info" | "ai" | "human";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({
  variant = "info",
  className,
  children,
  ...props
}: BadgeProps) {
  // Combine base badge class with the variant class
  const badgeClass =
    `${styles.badge} ${styles[variant]} ${className || ""}`.trim();

  return (
    <span className={badgeClass} {...props}>
      {children}
    </span>
  );
}
