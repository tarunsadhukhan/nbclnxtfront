import React from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
}

/**
 * A textarea component that automatically adjusts its height based on content.
 * Useful for remarks/notes fields in transaction line items.
 *
 * @example
 * ```tsx
 * <AutoResizeTextarea
 *   value={item.remarks}
 *   onChange={(e) => handleChange(e.target.value)}
 *   placeholder="Notes"
 *   minHeight={40}
 *   maxHeight={240}
 * />
 * ```
 */
export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minHeight = 40, maxHeight = 240, className = "", onInput, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const adjustHeight = React.useCallback(
      (element: HTMLTextAreaElement) => {
        element.style.height = "auto";
        element.style.height = `${Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)}px`;
      },
      [minHeight, maxHeight]
    );

    const handleInput = React.useCallback(
      (event: React.FormEvent<HTMLTextAreaElement>) => {
        adjustHeight(event.currentTarget);
        onInput?.(event);
      },
      [adjustHeight, onInput]
    );

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        adjustHeight(event.currentTarget);
        onChange?.(event);
      },
      [adjustHeight, onChange]
    );

    React.useEffect(() => {
      if (textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    }, [props.value, adjustHeight]);

    return (
      <textarea
        {...props}
        ref={combinedRef}
        className={`h-auto w-full resize-none border-0 bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
        style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        rows={1}
        onInput={handleInput}
        onChange={handleChange}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;

