import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import type { AdminCertificateRow } from '../api/certificates-admin';
import type { CertificateFormState } from '../certificateForm';
import { CertificateFields } from './CertificateFields';
import { CertificateFileField } from './CertificateFileField';

export type CertificateRowCardProps = {
	row: AdminCertificateRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	draftForm: CertificateFormState;
	onDraftInput: <K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) => void;
	onDraftImageSelect: (file: File | null) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** Single certificate item supporting read summary, inline edit with optional image replacement, and delete confirmation. */
export function CertificateRowCard(props: CertificateRowCardProps) {
	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt={`¿Eliminar «${props.row.title}»?`}
			pending={props.pending}
			onStartEdit={props.onStartEdit}
			onCancelEdit={props.onCancelEdit}
			onSubmitEdit={props.onSubmitEdit}
			onRequestDelete={props.onRequestDelete}
			onConfirmDelete={props.onConfirmDelete}
			onCancelDelete={props.onCancelDelete}
			summary={
				<>
					<p class="truncate font-medium">{props.row.title}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{props.row.description || 'Sin descripción.'}
					</p>
					<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
						{props.row.date} · {props.row.image ? 'Con imagen' : 'Sin imagen'}
					</p>
					<p class="mt-1 truncate text-[12px] text-muted-foreground">
						{props.row.issuerLink || 'Sin link del lugar.'}
					</p>
				</>
			}
			editFields={
				<>
					<CertificateFields
						form={props.draftForm}
						prefix={`certificate-edit-${props.row.id}`}
						disabled={props.pending}
						onInput={props.onDraftInput}
					/>
					<CertificateFileField
						id={`certificate-edit-image-${props.row.id}`}
						label="REEMPLAZAR IMAGEN (OPCIONAL)"
						hint={
							props.row.image
								? 'Ya hay una imagen cargada: si no elegís otra, se mantiene.'
								: 'Este certificado no tiene imagen.'
						}
						disabled={props.pending}
						onSelect={props.onDraftImageSelect}
					/>
				</>
			}
		/>
	);
}
