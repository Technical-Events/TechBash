import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center border px-4 text-sm font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-100 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "border-accent bg-accent text-bg hover:bg-transparent hover:text-accent",
  secondary:
    "border-line text-fg hover:border-accent hover:bg-accent hover:text-bg",
  danger: "border-danger text-danger hover:bg-danger hover:text-bg",
};

const disabled =
  "disabled:cursor-not-allowed disabled:border-dashed disabled:border-line disabled:bg-transparent disabled:text-muted disabled:opacity-50 disabled:active:translate-y-0";

function Label({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true">[&nbsp;</span>
      {children}
      <span aria-hidden="true">&nbsp;]</span>
    </>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], disabled, className)}
      {...props}
    >
      <Label>{children}</Label>
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      <Label>{children}</Label>
    </Link>
  );
}
