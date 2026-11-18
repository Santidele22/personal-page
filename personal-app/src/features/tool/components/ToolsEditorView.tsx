import { AdminCreateSection } from '../../../shared/ui/admin/AdminCreateSection';
import { AdminFeedbackBanner } from '../../../shared/ui/admin/AdminFeedbackBanner';
import { AdminListSection } from '../../../shared/ui/admin/AdminListSection';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { ToolRow } from '../api/tools-admin';
import type { ToolFormState } from '../toolForm';
import { ToolFields } from './ToolFields';
import { ToolRowCard } from './ToolRowCard';

export type ToolsEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	rows: readonly ToolRow[];
	pending: boolean;
	newForm: ToolFormState;
	draftForm: ToolFormState;
	editingId: number | null;
	confirmingDeleteId: number | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) => void;
	onDraftInput: <K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) => void;
	onStartEdit: (row: ToolRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the tools admin CRUD panel (`/admin/herramientas/`). */
export function ToolsEditorView(props: ToolsEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando las herramientas…"
				errorText="No pudimos cargar las herramientas. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<AdminFeedbackBanner feedback={props.feedback} />

				<AdminCreateSection
					headingId="herramientas-nueva"
					heading="NUEVA HERRAMIENTA"
					submitLabel="Añadir"
					pending={props.pending}
					submitDisabled={!props.newForm.name.trim()}
					onSubmit={props.onCreateSubmit}
				>
					<ToolFields
						form={props.newForm}
						prefix="tool-new"
						withHints
						disabled={props.pending}
						onInput={props.onNewInput}
					/>
					<p class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
						El nombre no puede quedar vacío. La nota «para qué sirve» se muestra en una línea bajo el nombre. El link abre la
						página de la herramienta desde la landing: dejalo vacío si todavía no tiene una.
					</p>
				</AdminCreateSection>

				<AdminListSection
					headingId="herramientas-lista"
					heading="HERRAMIENTAS GUARDADAS"
					rows={props.rows}
					singularLabel="fila"
					pluralLabel="filas"
					emptyText="Todavía no hay herramientas guardadas: la landing no muestra el bloque. Añade la primera en el formulario de arriba."
				>
					{(row) => (
						<ToolRowCard
							row={row}
							editing={props.editingId === row.id}
							confirmingDelete={props.confirmingDeleteId === row.id}
							pending={props.pending}
							draftForm={props.draftForm}
							onDraftInput={props.onDraftInput}
							onStartEdit={() => props.onStartEdit(row)}
							onCancelEdit={props.onCancelEdit}
							onSubmitEdit={(event) => props.onSubmitEdit(event, row.id)}
							onRequestDelete={() => props.onRequestDelete(row.id)}
							onConfirmDelete={() => props.onConfirmDelete(row.id)}
							onCancelDelete={props.onCancelDelete}
						/>
					)}
				</AdminListSection>
			</AdminStatusGate>
		</div>
	);
}
