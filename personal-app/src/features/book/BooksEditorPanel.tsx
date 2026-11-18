import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createBook,
	deleteBook,
	fetchAdminBooks,
	updateBook,
	uploadBookFile,
} from './api/books-admin';
import type { AdminBookRow } from './api/books-admin';
import {
	EMPTY_BOOK_FORM,
	bookFormToBody,
	bookToForm,
	validateBookForm,
} from './bookForm';
import type { BookFormState } from './bookForm';
import { BooksEditorView } from './components/BooksEditorView';

/**
 * Admin CRUD container for the `books` domain (`/admin/libros/`).
 * Manages collection fetch, create, inline edit, two-step delete, and PDF
 * upload through `createAdminCrudState`, keeping the view purely presentational.
 * Session gating lives in `AdminTopBar`.
 */
export default function BooksEditorPanel() {
	const crud = createAdminCrudState<AdminBookRow>({
		fetchRows: fetchAdminBooks,
	});

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [uploadingId, setUploadingId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<BookFormState>(EMPTY_BOOK_FORM);
	const [draftForm, setDraftForm] = createSignal<BookFormState>(EMPTY_BOOK_FORM);

	onMount(() => {
		void crud.load();
	});

	function updateNew<K extends keyof BookFormState>(key: K, value: BookFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof BookFormState>(key: K, value: BookFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	async function submitValidated(
		form: BookFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		const problem = validateBookForm(form);
		if (problem) {
			crud.setFeedback({ kind: 'error', message: problem });
			return false;
		}

		return crud.mutate(action, successMessage);
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const current = newForm();
		const created = await submitValidated(
			current,
			() => createBook(bookFormToBody(current)),
			'Libro agregado. La web lo muestra cuando lo publiques.',
		);

		if (created) setNewForm(EMPTY_BOOK_FORM);
	}

	function startEdit(row: AdminBookRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(bookToForm(row));
		crud.clearFeedback();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_BOOK_FORM);
		crud.clearFeedback();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			current,
			() => updateBook(id, bookFormToBody(current)),
			'Cambios guardados. La web ya los muestra.',
		);

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await crud.mutate(
			() => deleteBook(id),
			'Libro eliminado. La web ya no lo muestra.',
		);

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	async function handleUpload(id: number, file: File) {
		if (crud.pending()) return;

		setUploadingId(id);
		try {
			await crud.mutate(
				() => uploadBookFile(id, file),
				'PDF subido. Ya se puede descargar desde la web.',
			);
		} finally {
			setUploadingId(null);
		}
	}

	return (
		<BooksEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			rows={crud.rows()}
			pending={crud.pending()}
			newForm={newForm()}
			draftForm={draftForm()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			uploadingId={uploadingId()}
			onRetry={() => void crud.load()}
			onCreateSubmit={(event) => void handleCreate(event)}
			onNewInput={updateNew}
			onDraftInput={updateDraft}
			onStartEdit={startEdit}
			onCancelEdit={cancelEdit}
			onSubmitEdit={(event, id) => void handleEdit(event, id)}
			onRequestDelete={(id) => setConfirmingDeleteId(id)}
			onConfirmDelete={(id) => void handleDelete(id)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
			onUploadFile={(id, file) => void handleUpload(id, file)}
		/>
	);
}
