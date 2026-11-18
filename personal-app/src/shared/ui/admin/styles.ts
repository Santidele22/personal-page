/**
 * Shared Tailwind utility classes for admin editor panels, aligned with the
 * washi/sumi/aka tokens in `app/styles/global.css`.
 */

export const adminLabelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';

export const adminSectionHeadingClass =
	'text-[11px] font-medium tracking-[0.25em] text-muted-foreground';

export const adminInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60';

export const adminHintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';

export const adminCardClass = 'border border-border bg-card p-6';

export const adminPrimaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

export const adminRowButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

export const adminDangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';
