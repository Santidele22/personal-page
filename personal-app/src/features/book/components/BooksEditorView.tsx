import { AdminCreateSection } from '../../../shared/ui/admin/AdminCreateSection';
import { AdminFeedbackBanner } from '../../../shared/ui/admin/AdminFeedbackBanner';
import { AdminListSection } from '../../../shared/ui/admin/AdminListSection';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import { adminHintClass } from '../../../shared/ui/admin/styles';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { AdminBookRow } from '../api/books-admin';
import type { BookFormState } from '../bookForm';
import { BookFields } from './BookFields';
import { BookRowCard } from './BookRowCard';

export type BooksEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	rows: readonly AdminBookRow[];
	pending: boolean;
	newForm: BookFormState;
	draftForm: BookFormState;
	editingId: number | null;
	confirmingDeleteId: number | null;
	uploadingId: number | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => void;
	onDraftInput: <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => void;
	onStartEdit: (row: AdminBookRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
	onUploadFile: (id: number, file: File) => void;
};

/** Presentational view for the books admin CRUD panel. */
export function BooksEditorView(props: BooksEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando los libros…"
				errorText="No pudimos cargar los libros. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<AdminFeedbackBanner feedback={props.feedback} />

				<AdminCreateSection
					headingId="libros-nuevo"
					heading="NUEVO LIBRO"
					submitLabel="Agregar libro"
					pendingLabel="Agregando…"
					pending={props.pending}
					onSubmit={props.onCreateSubmit}
				>
					<p class={`${adminHintClass} mt-0`}>
						Se agrega al final de la lista. Después podés subirle el PDF desde la lista.
					</p>
					<BookFields
						form={props.newForm}
						prefix="book-new"
						disabled={props.pending}
						onInput={props.onNewInput}
					/>
				</AdminCreateSection>

				<AdminListSection
					headingId="libros-lista"
					heading="LIBROS CARGADOS"
					rows={props.rows}
					singularLabel="libro"
					pluralLabel="libros"
					emptyText="Todavía no hay libros cargados. En la web la sección queda con su estado vacío hasta que publiques uno."
				>
					{(row) => (
						<BookRowCard
							row={row}
							editing={props.editingId === row.id}
							confirmingDelete={props.confirmingDeleteId === row.id}
							pending={props.pending}
							uploading={props.uploadingId === row.id}
							draftForm={props.draftForm}
							onDraftInput={props.onDraftInput}
							onStartEdit={() => props.onStartEdit(row)}
							onCancelEdit={props.onCancelEdit}
							onSubmitEdit={(event) => props.onSubmitEdit(event, row.id)}
							onRequestDelete={() => props.onRequestDelete(row.id)}
							onConfirmDelete={() => props.onConfirmDelete(row.id)}
							onCancelDelete={props.onCancelDelete}
							onUploadFile={(file) => props.onUploadFile(row.id, file)}
						/>
					)}
				</AdminListSection>
			</AdminStatusGate>
		</div>
	);
}
