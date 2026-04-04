"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");

    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      const mobile = e.matches;
      setIsMobile(mobile);
      // On desktop: sidebar open by default; on mobile: closed
      setIsOpen(!mobile);
    }

    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
