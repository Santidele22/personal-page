import { createSignal, Show } from 'solid-js';
import { adminHintClass, adminRowButtonClass } from '../../../shared/ui/admin/styles';
import type { AdminBookRow } from '../api/books-admin';
import { formatBookFileSize } from '../bookForm';

export type BookFileUploadProps = {
	book: AdminBookRow;
	uploading: boolean;
	disabled?: boolean;
	onUpload: (file: File) => void;
};

/**
 * Presentational PDF picker for one book row. Holds only the transient file
 * selection and delegates the upload request to the container.
 */
export function BookFileUpload(props: BookFileUploadProps) {
	const [file, setFile] = createSignal<File | null>(null);
	const inputId = () => `book-file-${props.book.id}`;
	const size = () => formatBookFileSize(props.book.fileSize);

	return (
		<div class="mt-4 border-t border-border pt-4">
			<Show when={props.book.originalName}>
				<p class="text-[12px] text-muted-foreground">
					PDF actual:{' '}
					<span class="font-mono text-[11px] text-foreground">{props.book.originalName}</span>
					<Show when={size()}>
						{' '}
						· {size()}
					</Show>
				</p>
			</Show>
			<form
				class="mt-3 flex flex-wrap items-center gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					const selected = file();
					if (selected) props.onUpload(selected);
				}}
			>
				<label for={inputId()} class={adminHintClass}>
					{props.book.originalName ? 'Reemplazar PDF' : 'Subir PDF'}
				</label>
				<input
					id={inputId()}
					type="file"
					accept="application/pdf"
					disabled={props.disabled || props.uploading}
					onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
					class="block max-w-full text-[12px] text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:border-aka hover:file:text-aka disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<button
					type="submit"
					disabled={props.disabled || props.uploading || file() === null}
					class={adminRowButtonClass}
				>
					{props.uploading ? 'Subiendo…' : 'Subir'}
				</button>
			</form>
		</div>
	);
}
