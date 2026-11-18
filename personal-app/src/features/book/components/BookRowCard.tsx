import { Show } from 'solid-js';
import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import { adminRowButtonClass } from '../../../shared/ui/admin/styles';
import type { AdminBookRow } from '../api/books-admin';
import { bookKindLabel, bookStatusLabel } from '../bookForm';
import type { BookFormState } from '../bookForm';
import { BookFields } from './BookFields';
import { BookFileUpload } from './BookFileUpload';

const badgeClass =
	'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground';

export type BookRowCardProps = {
	row: AdminBookRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	uploading: boolean;
	draftForm: BookFormState;
	onDraftInput: <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
	onUploadFile: (file: File) => void;
};

/** Single book item supporting summary, PDF upload, reader link, inline edit, and delete confirmation. */
export function BookRowCard(props: BookRowCardProps) {
	const canRead = () => props.row.published === true && Boolean(props.row.filePath || props.row.originalName);

	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt="¿Eliminar este libro y su PDF?"
			pending={props.pending}
			onStartEdit={props.onStartEdit}
			onCancelEdit={props.onCancelEdit}
			onSubmitEdit={props.onSubmitEdit}
			onRequestDelete={props.onRequestDelete}
			onConfirmDelete={props.onConfirmDelete}
			onCancelDelete={props.onCancelDelete}
			summary={
				<div>
					<div class="flex flex-wrap items-center gap-2">
						<span class={badgeClass}>{bookStatusLabel(props.row.status)}</span>
						<span class={badgeClass}>{bookKindLabel(props.row.kind)}</span>
						<span class={badgeClass}>
							{props.row.published === true ? 'Publicado' : 'Borrador'}
						</span>
						<Show when={canRead()}>
							<a href={`/lecturas/${props.row.id}`} class={adminRowButtonClass}>
								Leer
							</a>
						</Show>
					</div>
					<p class="mt-2 font-mincho text-xl font-semibold tracking-tight">{props.row.title}</p>
					<p class="mt-1 text-sm text-aka">{props.row.author}</p>
					<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
						{props.row.description}
					</p>
					<Show when={props.row.review}>
						<blockquote class="mt-3 max-w-2xl border-l-2 border-aka/40 pl-4 text-sm italic leading-relaxed text-muted-foreground">
							{props.row.review}
						</blockquote>
					</Show>
					<BookFileUpload
						book={props.row}
						uploading={props.uploading}
						disabled={props.pending}
						onUpload={props.onUploadFile}
					/>
				</div>
			}
			editFields={
				<BookFields
					form={props.draftForm}
					prefix={`book-edit-${props.row.id}`}
					disabled={props.pending}
					onInput={props.onDraftInput}
				/>
			}
		/>
	);
}
