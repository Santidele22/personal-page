import { Show } from 'solid-js';
import { AdminCreateSection } from '../../../shared/ui/admin/AdminCreateSection';
import { AdminFeedbackBanner } from '../../../shared/ui/admin/AdminFeedbackBanner';
import { AdminListSection } from '../../../shared/ui/admin/AdminListSection';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { AdminCertificateRow } from '../api/certificates-admin';
import type { CertificateFormState } from '../certificateForm';
import { CertificateFields } from './CertificateFields';
import { CertificateFileField } from './CertificateFileField';
import { CertificateRowCard } from './CertificateRowCard';

export type CertificatesEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	rows: readonly AdminCertificateRow[];
	pending: boolean;
	newForm: CertificateFormState;
	newImageVersion: number;
	draftForm: CertificateFormState;
	editingId: number | null;
	confirmingDeleteId: number | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) => void;
	onNewImageSelect: (file: File | null) => void;
	onDraftInput: <K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) => void;
	onDraftImageSelect: (file: File | null) => void;
	onStartEdit: (row: AdminCertificateRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the certificates admin CRUD panel. */
export function CertificatesEditorView(props: CertificatesEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando los certificados…"
				errorText="No pudimos cargar los certificados. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<AdminFeedbackBanner feedback={props.feedback} />

				<AdminCreateSection
					headingId="certificados-nuevo"
					heading="NUEVO CERTIFICADO"
					submitLabel="Añadir certificado"
					pendingLabel="Guardando…"
					pending={props.pending}
					onSubmit={props.onCreateSubmit}
				>
					<CertificateFields
						form={props.newForm}
						prefix="certificate-new"
						disabled={props.pending}
						onInput={props.onNewInput}
					/>
					<Show when={props.newImageVersion} keyed>
						<CertificateFileField
							id="certificate-new-image"
							label="IMAGEN (OPCIONAL)"
							hint="PNG, JPEG o WebP de hasta 5 MB. Si no subís ninguna, la tarjeta se muestra sin imagen."
							disabled={props.pending}
							onSelect={props.onNewImageSelect}
						/>
					</Show>
				</AdminCreateSection>

				<AdminListSection
					headingId="certificados-lista"
					heading="CERTIFICADOS GUARDADOS"
					rows={props.rows}
					singularLabel="certificado"
					pluralLabel="certificados"
					emptyText="Todavía no hay certificados guardados: la web muestra el estado vacío de la sección. Añade el primero en el formulario de arriba."
				>
					{(row) => (
						<CertificateRowCard
							row={row}
							editing={props.editingId === row.id}
							confirmingDelete={props.confirmingDeleteId === row.id}
							pending={props.pending}
							draftForm={props.draftForm}
							onDraftInput={props.onDraftInput}
							onDraftImageSelect={props.onDraftImageSelect}
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
