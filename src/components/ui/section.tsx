import type React from "react";
import { cn } from "@/utils/cn";

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn("rounded-md border border-border/40 bg-secondary-bg/40 p-3", className)}>
      <div className="mb-3">
        <h4 className="font-semibold text-sm text-text tracking-wide">{title}</h4>
        {description && <p className="text-text-lighter text-xs">{description}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingRow({ label, description, children, className }: SettingRowProps) {
  return (
    <div
      className={cn("flex min-h-[40px] items-center justify-between gap-4 rounded px-1", className)}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-text text-xs">{label}</div>
        {description && <div className="text-[11px] text-text-lighter">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
