import { createSignal, onMount } from 'solid-js';
import {
	changedProfileFields,
	discardProfileDraft,
	fetchProfile,
	fetchProfileDraft,
	publishProfileChanges,
	saveProfileDraft,
} from './api/profile';
import {
	EMPTY_PROFILE_FORM,
	normalizeProfileDraft,
	profileFormToBody,
	profileToForm,
} from './profileForm';
import type {
	ProfileEditorFeedback,
	ProfileEditorPending,
	ProfileEditorStatus,
	ProfileFormState,
	ProfileValueForm,
} from './profileForm';
import type { ProfileCommitment } from './types';
import { ProfileEditorView } from './components/ProfileEditorView';

/**
 * Admin editor for the singleton site profile. It reads `GET /profile` (plus
 * the admin-only draft) and keeps bio as one paragraph per line and values as
 * `title`/`description` rows. Saving matches the diario editor (issue 29)
 * for the profile panel (feature doc `odd/tasks/profile-draft.md`):
 * «Guardar borrador» stores only the fields changed since the last load or
 * save through `PUT /profile/draft` without touching the landing, and
 * «Publicar» sends the changed fields against the published state through
 * `POST /profile/publish`, which clears the stored draft in the same call.
 * The backend merges any partial body into the stored row. The session gate
 * lives in the admin shell (`AdminTopBar` mounts `SessionGuard`), like the
 * other panels.
 *
 * The panel is a singleton editor, not a list: there are no rows to create or
 * delete and three different mutations (draft, publish, discard) with their own
 * pending lock, so `createAdminCrudState` (list-shaped: refetch after mutate,
 * one success message) does not fit and the load/save state stays here.
 */
export default function ProfileEditorPanel() {
	const [status, setStatus] = createSignal<ProfileEditorStatus>('loading');
	const [form, setForm] = createSignal<ProfileFormState>(EMPTY_PROFILE_FORM);
	const [savedForm, setSavedForm] = createSignal<ProfileFormState>(EMPTY_PROFILE_FORM);
	const [publishedForm, setPublishedForm] = createSignal<ProfileFormState>(EMPTY_PROFILE_FORM);
	const [hasDraft, setHasDraft] = createSignal(false);
	const [pending, setPending] = createSignal<ProfileEditorPending>(null);
	const [feedback, setFeedback] = createSignal<ProfileEditorFeedback>('idle');
	const [confirmingDiscard, setConfirmingDiscard] = createSignal(false);

	async function load() {
		setStatus('loading');
		setFeedback('idle');

		// The published row always loads; the draft read only answers with the
		// admin session in place, and the panel mounts behind `SessionGuard`.
		const [profile, draft] = await Promise.all([fetchProfile(), fetchProfileDraft().catch(() => null)]);

		if (!profile) {
			setStatus('error');
			return;
		}

		// `fetchProfile` already runs its URLs through `safeHref`; the raw draft
		// read needs the same pass so a foreign scheme never reaches the form.
		const draftNormalized = normalizeProfileDraft(draft);

		const nextForm = profileToForm(draftNormalized ?? profile);
		setForm(nextForm);
		setSavedForm(nextForm);
		setPublishedForm(profileToForm(profile));
		setHasDraft(draftNormalized !== null);
		setStatus('ready');
	}

	onMount(() => {
		void load();
	});

	function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
		setFeedback('idle');
	}

	function updateCommitment(index: number, field: keyof ProfileCommitment, value: string) {
		setForm((current) => ({
			...current,
			commitments: current.commitments.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [field]: value } : item,
			),
		}));
		setFeedback('idle');
	}

	function addCommitment() {
		setForm((current) => ({
			...current,
			commitments: [...current.commitments, { value: '', label: '' }],
		}));
		setFeedback('idle');
	}

	function removeCommitment(index: number) {
		setForm((current) => ({
			...current,
			commitments: current.commitments.filter((_, itemIndex) => itemIndex !== index),
		}));
		setFeedback('idle');
	}

	function updateValue(index: number, field: keyof ProfileValueForm, value: string) {
		setForm((current) => ({
			...current,
			values: current.values.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [field]: value } : item,
			),
		}));
		setFeedback('idle');
	}

	function addValue() {
		setForm((current) => ({
			...current,
			values: [...current.values, { title: '', description: '' }],
		}));
		setFeedback('idle');
	}

	function removeValue(index: number) {
		setForm((current) => ({
			...current,
			values: current.values.filter((_, itemIndex) => itemIndex !== index),
		}));
		setFeedback('idle');
	}

	/** The editor state differences against the last saved snapshot (draft or published). */
	const changed = () =>
		Object.keys(changedProfileFields(profileFormToBody(savedForm()), profileFormToBody(form()))).length > 0;

	/** Publishing compares against the published state, so a stored draft that is untouched still publishes. */
	const changedAgainstPublished = () =>
		Object.keys(
			changedProfileFields(profileFormToBody(publishedForm()), profileFormToBody(form())),
		).length > 0;

	const canSaveDraft = () => pending() === null && changed();
	const canPublish = () => pending() === null && changedAgainstPublished();

	async function saveDraft(event: MouseEvent) {
		event.preventDefault();

		if (!canSaveDraft()) return;

		const current = profileFormToBody(form());
		const changes = changedProfileFields(profileFormToBody(savedForm()), current);
		setFeedback('idle');
		setPending('draft');

		try {
			const savedDraft = await saveProfileDraft(changes);

			if (savedDraft) {
				setSavedForm(profileToForm(savedDraft));
				setHasDraft(true);
				setFeedback('draftSaved');
			} else {
				// The merge ended up equal to the published profile, so the
				// backend cleared the draft; the form returns to that state.
				setForm(publishedForm());
				setSavedForm(publishedForm());
				setHasDraft(false);
				setFeedback('discarded');
			}
		} catch {
			// The API may answer with a raw English message (`Unauthorized`); the
			// panel always answers in Spanish, like the subscribers view.
			setFeedback('error');
		} finally {
			setPending(null);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!canPublish()) return;

		const current = profileFormToBody(form());
		const changes = changedProfileFields(profileFormToBody(publishedForm()), current);
		setFeedback('idle');
		setPending('publish');

		try {
			await publishProfileChanges(changes);
			setForm(profileToForm(current));
			setSavedForm(profileToForm(current));
			setPublishedForm(profileToForm(current));
			setHasDraft(false);
			setFeedback('published');
		} catch {
			// The API may answer with a raw English message (`Unauthorized`); the
			// panel always answers in Spanish, like the subscribers view.
			setFeedback('error');
		} finally {
			setPending(null);
		}
	}

	async function confirmDiscard() {
		if (pending() !== null) return;

		setPending('discard');
		setFeedback('idle');

		try {
			await discardProfileDraft();
			setForm(publishedForm());
			setSavedForm(publishedForm());
			setHasDraft(false);
			setConfirmingDiscard(false);
			setFeedback('discarded');
		} catch {
			setFeedback('error');
		} finally {
			setPending(null);
		}
	}

	return (
		<ProfileEditorView
			status={status()}
			form={form()}
			hasDraft={hasDraft()}
			pending={pending()}
			feedback={feedback()}
			canSaveDraft={canSaveDraft()}
			canPublish={canPublish()}
			confirmingDiscard={confirmingDiscard()}
			onRetry={() => void load()}
			onInput={update}
			onValueInput={updateValue}
			onAddValue={addValue}
			onRemoveValue={removeValue}
			onCommitmentInput={updateCommitment}
			onAddCommitment={addCommitment}
			onRemoveCommitment={removeCommitment}
			onSubmit={(event) => void handleSubmit(event)}
			onSaveDraft={(event) => void saveDraft(event)}
			onRequestDiscard={() => setConfirmingDiscard(true)}
			onConfirmDiscard={() => void confirmDiscard()}
			onCancelDiscard={() => setConfirmingDiscard(false)}
		/>
	);
}
