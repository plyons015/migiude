"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** When false, nothing is portaled (caller handles closed state). */
  active: boolean;
};

/**
 * Render modals on document.body so `position: fixed` centers on the viewport.
 * Ancestors with backdrop-filter/transform (e.g. sticky header) otherwise trap fixed children.
 */
export function ModalPortal({ children, active }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!active || !mounted) return null;
  return createPortal(children, document.body);
}
