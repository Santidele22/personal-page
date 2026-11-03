import { createSignal, Index, onMount, Show } from 'solid-js';
import {
	changedProfileFields,
	discardProfileDraft,
	fetchProfile,
	fetchProfileDraft,
	publishProfileChanges,
	saveProfileDraft,
} from './api/profile';
import { safeHref } from '../../shared/api/url';
import type { Profile, ProfileCommitment } from './types';

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
 */

/** One VALUE row; the API still stores it as a single `Title: description` line. */
type ProfileValue = {
	title: string;
	description: string;
};

type FormState = {
	name: string;
	role: string;
	eyebrow: string;
	heroTitle: string;
	heroIntro: string;
	/** One paragraph per line. */
	bioParagraphs: string;
	/** One `title`/`description` pair per row. */
	values: ProfileValue[];
	commitments: ProfileCommitment[];
	siteName: string;
	siteTitle: string;
	siteDescription: string;
	siteAuthor: string;
	githubUrl: string;
	linkedinUrl: string;
	contactIntro: string;
	footerBlurb: string;
	footerCopyright: string;
};

type Status = 'loading' | 'ready' | 'error';
type Pending = null | 'draft' | 'publish' | 'discard';
type Feedback = 'idle' | 'draftSaved' | 'published' | 'discarded' | 'error';

const EMPTY_FORM: FormState = {
	name: '',
	role: '',
	eyebrow: '',
	heroTitle: '',
	heroIntro: '',
	bioParagraphs: '',
	values: [],
	commitments: [],
	siteName: '',
	siteTitle: '',
	siteDescription: '',
	siteAuthor: '',
	githubUrl: '',
	linkedinUrl: '',
	contactIntro: '',
	footerBlurb: '',
	footerCopyright: '',
};

function toForm(profile: Profile): FormState {
	return {
		name: profile.name,
		role: profile.role,
		eyebrow: profile.eyebrow,
		heroTitle: profile.heroTitle,
		heroIntro: profile.heroIntro,
		bioParagraphs: profile.bioParagraphs.join('\n'),
		values: toValuePairs(profile.values),
		commitments: profile.commitments.map((item) => ({ ...item })),
		siteName: profile.siteName,
		siteTitle: profile.siteTitle,
		siteDescription: profile.siteDescription,
		siteAuthor: profile.siteAuthor,
		githubUrl: profile.githubUrl,
		linkedinUrl: profile.linkedinUrl,
		contactIntro: profile.contactIntro,
		footerBlurb: profile.footerBlurb,
		footerCopyright: profile.footerCopyright,
	};
}

/** Textarea text → list, dropping the blank lines used as separators. */
function toLines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Stored `Title: description` line → pair. Each line is split on its FIRST colon
 * only, so a colon inside the description survives untouched; a line without a
 * colon keeps all its text as the title and an empty description.
 */
function toValuePairs(lines: string[]): ProfileValue[] {
	return lines.map((line) => {
		const separator = line.indexOf(':');

		if (separator === -1) {
			return { title: line, description: '' };
		}

		return {
			title: line.slice(0, separator),
			description: line.slice(separator + 1).trimStart(),
		};
	});
}

/**
 * Pair list → the `string[]` the API stores, one `title: description` line each.
 * Rows with an empty title and description are dropped, and a row without a
 * description keeps only its title, so the values already stored round-trip.
 */
function fromValuePairs(values: ProfileValue[]): string[] {
	return values
		.map((item) => ({ title: item.title.trim(), description: item.description.trim() }))
		.filter((item) => item.title || item.description)
		.map((item) => (item.description ? `${item.title}: ${item.description}` : item.title));
}

function toProfile(form: FormState): Profile {
	return {
		name: form.name,
		role: form.role,
		eyebrow: form.eyebrow,
		heroTitle: form.heroTitle,
		heroIntro: form.heroIntro,
		bioParagraphs: toLines(form.bioParagraphs),
		values: fromValuePairs(form.values),
		commitments: form.commitments
			.map((item) => ({ value: item.value.trim(), label: item.label.trim() }))
			.filter((item) => item.value || item.label),
		siteName: form.siteName,
		siteTitle: form.siteTitle,
		siteDescription: form.siteDescription,
		siteAuthor: form.siteAuthor,
		githubUrl: form.githubUrl,
		linkedinUrl: form.linkedinUrl,
		contactIntro: form.contactIntro,
		footerBlurb: form.footerBlurb,
		footerCopyright: form.footerCopyright,
	};
}

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';

type FieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	multiline?: boolean;
	rows?: number;
	placeholder?: string;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by every field of the form. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<Show
				when={props.multiline}
				fallback={
					<input
						id={props.id}
						type="text"
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${inputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${inputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

export default function ProfileEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [form, setForm] = createSignal<FormState>(EMPTY_FORM);
	const [savedForm, setSavedForm] = createSignal<FormState>(EMPTY_FORM);
	const [publishedForm, setPublishedForm] = createSignal<FormState>(EMPTY_FORM);
	const [hasDraft, setHasDraft] = createSignal(false);
	const [pending, setPending] = createSignal<Pending>(null);
	const [feedback, setFeedback] = createSignal<Feedback>('idle');
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
		const draftNormalized = draft
			? { ...draft, githubUrl: safeHref(draft.githubUrl) ?? '', linkedinUrl: safeHref(draft.linkedinUrl) ?? '' }
			: null;

		const nextForm = toForm(draftNormalized ?? profile);
		setForm(nextForm);
		setSavedForm(nextForm);
		setPublishedForm(toForm(profile));
		setHasDraft(draftNormalized !== null);
		setStatus('ready');
	}

	onMount(() => {
		void load();
	});

	function update<K extends keyof FormState>(key: K, value: FormState[K]) {
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

	function updateValue(index: number, field: keyof ProfileValue, value: string) {
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
		Object.keys(changedProfileFields(toProfile(savedForm()), toProfile(form()))).length > 0;

	/** Publishing compares against the published state, so a stored draft that is untouched still publishes. */
	const changedAgainstPublished = () =>
		Object.keys(changedProfileFields(toProfile(publishedForm()), toProfile(form()))).length > 0;

	const canSaveDraft = () => pending() === null && changed();
	const canPublish = () => pending() === null && changedAgainstPublished();

	async function saveDraft(event: MouseEvent) {
		event.preventDefault();

		if (!canSaveDraft()) return;

		const current = toProfile(form());
		const changes = changedProfileFields(toProfile(savedForm()), current);
		setFeedback('idle');
		setPending('draft');

		try {
			const savedDraft = await saveProfileDraft(changes);

			if (savedDraft) {
				setSavedForm(toForm(savedDraft));
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

		const current = toProfile(form());
		const changes = changedProfileFields(toProfile(publishedForm()), current);
		setFeedback('idle');
		setPending('publish');

		try {
			await publishProfileChanges(changes);
			setForm(toForm(current));
			setSavedForm(toForm(current));
			setPublishedForm(toForm(current));
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
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando el perfil…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar el perfil. Inténtalo de nuevo en unos minutos.</p>
					<button
						type="button"
						onClick={() => void load()}
						class="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-aka hover:text-aka"
					>
						Reintentar
					</button>
				</div>
			</Show>

		<Show when={status() === 'ready'}>
			<form onSubmit={handleSubmit} class="flex flex-col gap-8">
				<Show when={hasDraft()}>
					<div
						role="note"
						class="flex flex-wrap items-center gap-4 border border-border bg-card px-6 py-4"
					>
						<p class="flex items-center gap-2 text-sm text-foreground">
							<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
							Tenés un borrador sin publicar. La web sigue mostrando el perfil publicado.
						</p>
						<button
							type="button"
							disabled={pending() !== null}
							onClick={() => setConfirmingDiscard(true)}
							class="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
						>
							Descartar borrador
						</button>
					</div>
				</Show>

				<section aria-labelledby="perfil-identidad" class="border border-border bg-card p-6">
						<h2 id="perfil-identidad" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							IDENTIDAD
						</h2>
						<div class="mt-5 grid gap-5 sm:grid-cols-2">
							<Field id="profile-name" label="NOMBRE" value={form().name} onInput={(value) => update('name', value)} />
							<Field id="profile-role" label="ROL" value={form().role} onInput={(value) => update('role', value)} />
						</div>
					</section>

					<section aria-labelledby="perfil-hero" class="border border-border bg-card p-6">
						<h2 id="perfil-hero" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							HERO
						</h2>
						<div class="mt-5 grid gap-5">
							<Field
								id="profile-eyebrow"
								label="ANTETÍTULO"
								value={form().eyebrow}
								hint="La línea en versalitas encima del título."
								onInput={(value) => update('eyebrow', value)}
							/>
							<Field
								id="profile-hero-title"
								label="TÍTULO"
								value={form().heroTitle}
								hint="Incluye el punto final: la web lo pinta en color de acento."
								onInput={(value) => update('heroTitle', value)}
							/>
							<Field
								id="profile-hero-intro"
								label="INTRODUCCIÓN"
								value={form().heroIntro}
								multiline
								rows={4}
								onInput={(value) => update('heroIntro', value)}
							/>
						</div>
					</section>

					<section aria-labelledby="perfil-sobre-mi" class="border border-border bg-card p-6">
						<h2 id="perfil-sobre-mi" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							SOBRE MÍ
						</h2>
						<div class="mt-5 grid gap-5">
							<Field
								id="profile-bio"
								label="BIO"
								value={form().bioParagraphs}
								multiline
								rows={6}
								hint="Un párrafo por línea; las líneas vacías se descartan."
								onInput={(value) => update('bioParagraphs', value)}
							/>
						</div>
					</section>

					<section aria-labelledby="perfil-valores" class="border border-border bg-card p-6">
						<div class="flex items-center justify-between gap-4">
							<h2 id="perfil-valores" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
								VALORES
							</h2>
							<button
								type="button"
								onClick={addValue}
								class="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka"
							>
								+ Añadir
							</button>
						</div>
						<p class={hintClass}>Cada valor con su descripción; se muestra en la web tal como se guarda.</p>
						<Show
							when={form().values.length > 0}
							fallback={<p class="mt-5 text-sm text-muted-foreground">Sin valores: la web no muestra la lista.</p>}
						>
							<ul class="mt-4 flex flex-col gap-3">
								<Index each={form().values}>
									{(value, index) => (
										<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
											<Field
												id={`profile-value-title-${index}`}
												label="VALOR"
												value={value().title}
												onInput={(input) => updateValue(index, 'title', input)}
											/>
											<Field
												id={`profile-value-description-${index}`}
												label="EXPLICACIÓN"
												value={value().description}
												onInput={(input) => updateValue(index, 'description', input)}
											/>
											<button
												type="button"
												onClick={() => removeValue(index)}
												class="mb-0.5 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
											>
												Quitar
											</button>
										</li>
									)}
								</Index>
							</ul>
						</Show>
					</section>

					<section aria-labelledby="perfil-compromisos" class="border border-border bg-card p-6">
						<div class="flex items-center justify-between gap-4">
							<h2 id="perfil-compromisos" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
								COMPROMISOS
							</h2>
							<button
								type="button"
								onClick={addCommitment}
								class="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka"
							>
								+ Añadir
							</button>
						</div>
						<p class={hintClass}>Los tres datos del hero: la cifra o el nombre, y qué significa.</p>
						<Show
							when={form().commitments.length > 0}
							fallback={<p class="mt-5 text-sm text-muted-foreground">Sin compromisos: el hero no muestra la fila de datos.</p>}
						>
							<ul class="mt-4 flex flex-col gap-3">
								<Index each={form().commitments}>
									{(commitment, index) => (
										<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
											<Field
												id={`profile-commitment-value-${index}`}
												label="DATO"
												value={commitment().value}
												onInput={(value) => updateCommitment(index, 'value', value)}
											/>
											<Field
												id={`profile-commitment-label-${index}`}
												label="DESCRIPCIÓN"
												value={commitment().label}
												onInput={(value) => updateCommitment(index, 'label', value)}
											/>
											<button
												type="button"
												onClick={() => removeCommitment(index)}
												class="mb-0.5 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
											>
												Quitar
											</button>
										</li>
									)}
								</Index>
							</ul>
						</Show>
					</section>

					<section aria-labelledby="perfil-meta" class="border border-border bg-card p-6">
						<h2 id="perfil-meta" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							META DEL SITIO
						</h2>
						<div class="mt-5 grid gap-5 sm:grid-cols-2">
							<Field id="profile-site-name" label="NOMBRE" value={form().siteName} onInput={(value) => update('siteName', value)} />
							<Field id="profile-site-author" label="AUTOR" value={form().siteAuthor} onInput={(value) => update('siteAuthor', value)} />
							<div class="sm:col-span-2">
								<Field id="profile-site-title" label="TÍTULO DE PESTAÑA" value={form().siteTitle} onInput={(value) => update('siteTitle', value)} />
							</div>
							<div class="sm:col-span-2">
								<Field
									id="profile-site-description"
									label="DESCRIPCIÓN"
									value={form().siteDescription}
									multiline
									rows={3}
									hint="Se usa en el meta description y en Open Graph."
									onInput={(value) => update('siteDescription', value)}
								/>
							</div>
						</div>
					</section>

					<section aria-labelledby="perfil-redes" class="border border-border bg-card p-6">
						<h2 id="perfil-redes" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							REDES
						</h2>
						<div class="mt-5 grid gap-5 sm:grid-cols-2">
							<Field id="profile-github" label="GITHUB" value={form().githubUrl} onInput={(value) => update('githubUrl', value)} />
							<Field id="profile-linkedin" label="LINKEDIN" value={form().linkedinUrl} onInput={(value) => update('linkedinUrl', value)} />
						</div>
					</section>

					<section aria-labelledby="perfil-pie" class="border border-border bg-card p-6">
						<h2 id="perfil-pie" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							CONTACTO Y PIE
						</h2>
						<div class="mt-5 grid gap-5">
							<Field
								id="profile-contact-intro"
								label="INTRO DE CONTACTO"
								value={form().contactIntro}
								multiline
								rows={4}
								onInput={(value) => update('contactIntro', value)}
							/>
							<Field
								id="profile-footer-blurb"
								label="TEXTO DEL PIE"
								value={form().footerBlurb}
								multiline
								rows={3}
								onInput={(value) => update('footerBlurb', value)}
							/>
							<Field
								id="profile-footer-copyright"
								label="COPYRIGHT"
								value={form().footerCopyright}
								hint="Se muestra tal cual, con el año incluido."
								onInput={(value) => update('footerCopyright', value)}
							/>
						</div>
					</section>

				<div class="flex flex-wrap items-center gap-4 border-t border-border pt-6">
					<button
						type="button"
						disabled={!canSaveDraft()}
						onClick={(event) => void saveDraft(event)}
						class="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60"
					>
						{pending() === 'draft' ? 'Guardando el borrador…' : 'Guardar borrador'}
					</button>
					<button
						type="submit"
						disabled={!canPublish()}
						class="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{pending() === 'publish' ? 'Publicando…' : 'Publicar'}
					</button>
					<Show when={feedback() === 'draftSaved'}>
						<p role="status" class="flex items-center gap-2 text-sm text-foreground">
							<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
							Borrador guardado. La web sigue mostrando el perfil publicado.
						</p>
					</Show>
					<Show when={feedback() === 'published'}>
						<p role="status" class="flex items-center gap-2 text-sm text-foreground">
							<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
							Perfil publicado. La web ya muestra los cambios.
						</p>
					</Show>
					<Show when={feedback() === 'discarded'}>
						<p role="status" class="flex items-center gap-2 text-sm text-foreground">
							<span class="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
							Borrador descartado. El formulario volvió al perfil publicado.
						</p>
					</Show>
					<Show when={feedback() === 'error'}>
						<p role="alert" class="text-sm text-destructive">
							No pudimos guardar el perfil. Inténtalo de nuevo en unos minutos.
						</p>
					</Show>
				</div>
				</form>
			</Show>

			{/*
				The discard dialog stays mounted (hidden while closed) so the markup
				is stable; it opens only from the banner's «Descartar borrador» and
				never from a stray click.
			*/}
			<Show when={confirmingDiscard()}>
				<div
					class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
					role="presentation"
					onClick={(event) => {
						if (event.target === event.currentTarget) setConfirmingDiscard(false);
					}}
				>
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="perfil-discard-title"
						aria-describedby="perfil-discard-description"
						class="w-full max-w-md border border-border bg-card p-6 shadow-xl"
					>
						<p class="text-[11px] font-medium tracking-[0.3em] text-destructive">DESCARTAR BORRADOR</p>
						<h2 id="perfil-discard-title" class="mt-2 font-mincho text-2xl font-semibold tracking-tight">
							¿Descartar el borrador?
						</h2>
						<p id="perfil-discard-description" class="mt-3 text-sm leading-relaxed text-muted-foreground">
							Los cambios guardados en el borrador se pierden por completo, la web sigue mostrando el
							perfil publicado y la acción no se puede deshacer.
						</p>

						<div class="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
							<button
								type="button"
								disabled={pending() === 'discard'}
								onClick={() => void confirmDiscard()}
								class="inline-flex h-10 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{pending() === 'discard' ? 'Descartando…' : 'Descartar'}
							</button>
							<button
								type="button"
								disabled={pending() === 'discard'}
								onClick={() => setConfirmingDiscard(false)}
								class="ml-auto inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
