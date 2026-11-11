import { forwardRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number | "" | null | undefined;
  onValueChange: (n: number) => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
}

/**
 * Text-based number input that ALWAYS uses "." as the decimal separator
 * (independent of the browser locale). Users can also type "," and it
 * is converted to "." automatically. Prevents multiple dots.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onValueChange, allowDecimals = true, min, max, className, onBlur, ...rest }, ref) => {
    const [text, setText] = useState<string>(
      value === "" || value === null || value === undefined ? "" : String(value),
    );

    // sync external value updates
    useEffect(() => {
      const incoming =
        value === "" || value === null || value === undefined ? "" : String(value);
      // only sync when the numeric value differs (avoid clobbering "12." typing state)
      const parsed = parseFloat(text.replace(",", "."));
      if (incoming === "" && text !== "") return;
      if (!Number.isNaN(parsed) && parsed === Number(value)) return;
      setText(incoming);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value.replace(",", ".");
      // strip anything that isn't digits, dot or leading minus
      v = v.replace(/[^\d.-]/g, "");
      // only one leading minus
      v = v.replace(/(?!^)-/g, "");
      // only one dot
      const firstDot = v.indexOf(".");
      if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
      }
      if (!allowDecimals) v = v.replace(".", "");
      setText(v);
      if (v === "" || v === "-" || v === ".") {
        onValueChange(0);
        return;
      }
      const n = parseFloat(v);
      if (!Number.isNaN(n)) {
        let clamped = n;
        if (typeof min === "number") clamped = Math.max(min, clamped);
        if (typeof max === "number") clamped = Math.min(max, clamped);
        onValueChange(clamped);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (text === "" || text === "-" || text === ".") {
        setText("");
      } else {
        const n = parseFloat(text);
        if (!Number.isNaN(n)) setText(String(n));
      }
      onBlur?.(e);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        lang="en"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
      />
    );
  },
);
NumericInput.displayName = "NumericInput";
