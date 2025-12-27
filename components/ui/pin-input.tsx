"use client";

import { useRef, useState, useCallback, KeyboardEvent, ClipboardEvent } from "react";

interface PinInputProps {
  length?: number;
  onComplete?: (pin: string) => void;
  onChange?: (pin: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PinInput({
  length = 4,
  onComplete,
  onChange,
  error,
  disabled = false,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  }, [length]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (disabled) return;

      const digit = value.replace(/\D/g, "").slice(-1);
      const newValues = [...values];
      newValues[index] = digit;
      setValues(newValues);

      const pin = newValues.join("");
      onChange?.(pin);

      if (digit && index < length - 1) {
        focusInput(index + 1);
      }

      if (pin.length === length && !newValues.includes("")) {
        onComplete?.(pin);
      }
    },
    [values, length, disabled, onChange, onComplete, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        const newValues = [...values];

        if (values[index]) {
          newValues[index] = "";
          setValues(newValues);
          onChange?.(newValues.join(""));
        } else if (index > 0) {
          newValues[index - 1] = "";
          setValues(newValues);
          onChange?.(newValues.join(""));
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [values, disabled, onChange, focusInput]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
      const digits = pastedData.slice(0, length).split("");

      const newValues = [...values];
      digits.forEach((digit, i) => {
        if (i < length) {
          newValues[i] = digit;
        }
      });
      setValues(newValues);

      const pin = newValues.join("");
      onChange?.(pin);

      if (digits.length >= length) {
        onComplete?.(pin);
      } else {
        focusInput(digits.length);
      }
    },
    [values, length, disabled, onChange, onComplete, focusInput]
  );

  return (
    <div className="w-full">
      <div className="flex justify-center gap-3">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={values[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            autoComplete="off"
            className={`
              w-14 h-16
              bg-background-secondary
              border-2 ${error ? "border-error" : "border-border"}
              rounded-xl
              text-center text-2xl font-bold text-foreground
              focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            `}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-error text-center">{error}</p>
      )}
    </div>
  );
}

export type { PinInputProps };
