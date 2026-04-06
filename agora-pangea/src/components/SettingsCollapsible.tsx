"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  badge?: ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  description,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen, children]);

  return (
    <div className="card overflow-hidden transition-shadow duration-200 hover:shadow-lg/5">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 p-5 text-left group"
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
      >
        <div className="w-9 h-9 rounded-lg bg-pangea-900/30 flex items-center justify-center shrink-0 group-hover:bg-pangea-900/50 transition-colors">
          <Icon className="w-4.5 h-4.5 text-pangea-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-fg truncate">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-fg-muted mt-0.5 truncate">{description}</p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-fg-muted shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content — animated */}
      <div
        id={`section-${id}`}
        style={{
          maxHeight: isOpen ? `${height}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
        className="transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div ref={contentRef} className="px-5 pb-5 pt-0">
          <div className="border-t border-theme pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Reusable toggle component
export function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
        enabled ? "bg-pangea-600" : "bg-theme-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className="w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform"
        style={{
          transform: enabled ? "translateX(22px)" : "translateX(0)",
          left: "2px",
        }}
      />
    </button>
  );
}

// Reusable setting row
export function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-fg-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-fg">{label}</p>
          <p className="text-xs text-fg-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// Radio group for visibility options
export function VisibilityRadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
            value === opt.value
              ? "border-pangea-500/50 bg-pangea-900/20"
              : "border-theme bg-theme-card/30 hover:border-theme/50"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-1 accent-pangea-500"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <opt.icon className="w-3.5 h-3.5 text-fg-muted" />
              <span className="text-sm text-fg font-medium">{opt.label}</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
