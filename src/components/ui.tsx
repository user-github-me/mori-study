'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  X,
  BookOpen,
  Layers,
  ListChecks,
  GalleryVerticalEnd,
  Play,
  PencilLine,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { MaterialKind } from '@/lib/types';

export const materialIcons = {
  lesson: BookOpen,
  slides: Layers,
  quiz: ListChecks,
  practice: PencilLine,
  flashcards: GalleryVerticalEnd,
  video: Play,
};
let openModals = 0;
let originalOverflow = '';
export function KindIcon({ kind, size = 17 }: { kind: MaterialKind; size?: number }) {
  const Icon = materialIcons[kind];
  return <Icon size={size} />;
}
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (openModals === 0) originalOverflow = document.body.style.overflow;
    openModals += 1;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    node?.focus();
    function key(event: KeyboardEvent) {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== node) return;
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab' && node) {
        const elements = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]',
          ),
        ).filter((el) => el.offsetParent !== null);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-top">
          <span>{title}</span>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
