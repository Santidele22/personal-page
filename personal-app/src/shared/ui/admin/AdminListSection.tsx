import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { formatAdminRowCount } from '../../lib/adminPanel';
import { adminSectionHeadingClass } from './styles';

export type AdminListSectionProps<TRow> = {
	headingId: string;
	heading: string;
	rows: readonly TRow[];
	singularLabel: string;
	pluralLabel: string;
	orderNote?: string;
	emptyText: string;
	children: (row: TRow) => JSX.Element;
};

/** Saved-records section with header counter, empty state fallback, and row list. */
export function AdminListSection<TRow>(props: AdminListSectionProps<TRow>) {
	return (
		<section aria-labelledby={props.headingId} class="flex flex-col gap-4">
			<div class="flex items-baseline justify-between gap-4">
				<h2 id={props.headingId} class={adminSectionHeadingClass}>
					{props.heading}
				</h2>
				<p class="font-mono text-[11px] text-muted-foreground">
					{formatAdminRowCount(
						props.rows.length,
						props.singularLabel,
						props.pluralLabel,
						props.orderNote,
					)}
				</p>
			</div>

			<Show
				when={props.rows.length > 0}
				fallback={
					<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
						{props.emptyText}
					</p>
				}
			>
				<ul class="flex flex-col gap-3">
					<For each={props.rows}>{(row) => props.children(row)}</For>
				</ul>
			</Show>
		</section>
	);
}
