"use client";

import { useFormStatus } from "react-dom";

interface AuthSubmitButtonProps {
  idleText: string;
  pendingText: string;
  className?: string;
}

export function AuthSubmitButton({ idleText, pendingText, className }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className={className} disabled={pending} type="submit">
      {pending ? pendingText : idleText}
    </button>
  );
}
