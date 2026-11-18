import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createCertificate,
	deleteCertificate,
	fetchAdminCertificates,
	updateCertificate,
} from './api/certificates-admin';
import type { AdminCertificateRow } from './api/certificates-admin';
import {
	EMPTY_CERTIFICATE_FORM,
	certificateFormToBody,
	certificateToForm,
	validateCertificateForm,
} from './certificateForm';
import type { CertificateFormState } from './certificateForm';
import { CertificatesEditorView } from './components/CertificatesEditorView';

/**
 * Admin CRUD container for the `certificates` domain (`/admin/certificados/`):
 * the portfolio section the landing renders from `GET /certificates`.
 * Manages collection fetch, multipart create/edit (with optional image), and
 * two-step delete through `createAdminCrudState`, keeping the view purely
 * presentational. Session gating lives in `AdminTopBar`.
 */
export default function CertificadosEditorPanel() {
	const crud = createAdminCrudState<AdminCertificateRow>({
		fetchRows: fetchAdminCertificates,
	});

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<CertificateFormState>(EMPTY_CERTIFICATE_FORM);
	const [newImage, setNewImage] = createSignal<File | null>(null);
	const [newImageVersion, setNewImageVersion] = createSignal(1);
	const [draftForm, setDraftForm] = createSignal<CertificateFormState>(EMPTY_CERTIFICATE_FORM);
	const [draftImage, setDraftImage] = createSignal<File | null>(null);

	onMount(() => {
		void crud.load();
	});

	function updateNew<K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	async function submitValidated(
		form: CertificateFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		const problem = validateCertificateForm(form);
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
			() => createCertificate(certificateFormToBody(current), newImage()),
			'Certificado añadido. La web ya muestra el cambio.',
		);

		if (created) {
			setNewForm(EMPTY_CERTIFICATE_FORM);
			setNewImage(null);
			// Remounts the picker so the browser clears the chosen filename.
			setNewImageVersion((version) => version + 1);
		}
	}

	function startEdit(row: AdminCertificateRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(certificateToForm(row));
		setDraftImage(null);
		crud.clearFeedback();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_CERTIFICATE_FORM);
		setDraftImage(null);
		crud.clearFeedback();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			current,
			() => updateCertificate(id, certificateFormToBody(current), draftImage()),
			'Cambios guardados.',
		);

		if (saved) {
			setEditingId(null);
			setDraftImage(null);
		}
	}

	async function handleDelete(id: number) {
		const removed = await crud.mutate(
			() => deleteCertificate(id),
			'Certificado eliminado.',
		);

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	return (
		<CertificatesEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			rows={crud.rows()}
			pending={crud.pending()}
			newForm={newForm()}
			newImageVersion={newImageVersion()}
			draftForm={draftForm()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			onRetry={() => void crud.load()}
			onCreateSubmit={(event) => void handleCreate(event)}
			onNewInput={updateNew}
			onNewImageSelect={setNewImage}
			onDraftInput={updateDraft}
			onDraftImageSelect={setDraftImage}
			onStartEdit={startEdit}
			onCancelEdit={cancelEdit}
			onSubmitEdit={(event, id) => void handleEdit(event, id)}
			onRequestDelete={(id) => setConfirmingDeleteId(id)}
			onConfirmDelete={(id) => void handleDelete(id)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
		/>
	);
}
