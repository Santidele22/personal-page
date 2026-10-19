import { createSignal, For, onMount, Show } from 'solid-js';
import { fetchProfile, updateProfile } from './api/profile';
import type { Profile, ProfileCommitment } from './types';

/**
 * Admin editor for the singleton site profile. It reads `GET /profile`, keeps
 * bio as one paragraph per line and values as `title`/`description` rows, then
 * writes the whole editable shape back with `PUT /profile`; the backend merges
 * it into the stored row, so sending every field is safe. The session gate
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
type Feedback = 'idle' | 'saved' | 'error';

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
	const [saving, setSaving] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>('idle');

	async function load() {
		setStatus('loading');
		setFeedback('idle');

		const profile = await fetchProfile();

		if (!profile) {
			setStatus('error');
			return;
		}

		setForm(toForm(profile));
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

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (saving()) return;

		const current = form();
		setSaving(true);
		setFeedback('idle');

		try {
			await updateProfile({
				name: current.name,
				role: current.role,
				eyebrow: current.eyebrow,
				heroTitle: current.heroTitle,
				heroIntro: current.heroIntro,
				bioParagraphs: toLines(current.bioParagraphs),
				values: fromValuePairs(current.values),
				commitments: current.commitments
					.map((item) => ({ value: item.value.trim(), label: item.label.trim() }))
					.filter((item) => item.value || item.label),
				siteName: current.siteName,
				siteTitle: current.siteTitle,
				siteDescription: current.siteDescription,
				siteAuthor: current.siteAuthor,
				githubUrl: current.githubUrl,
				linkedinUrl: current.linkedinUrl,
				contactIntro: current.contactIntro,
				footerBlurb: current.footerBlurb,
				footerCopyright: current.footerCopyright,
			});
			setFeedback('saved');
		} catch {
			// The API may answer with a raw English message (`Unauthorized`); the
			// panel always answers in Spanish, like the subscribers view.
			setFeedback('error');
		} finally {
			setSaving(false);
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
								<For each={form().values}>
									{(value, index) => (
										<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
											<Field
												id={`profile-value-title-${index()}`}
												label="VALOR"
												value={value.title}
												onInput={(input) => updateValue(index(), 'title', input)}
											/>
											<Field
												id={`profile-value-description-${index()}`}
												label="EXPLICACIÓN"
												value={value.description}
												onInput={(input) => updateValue(index(), 'description', input)}
											/>
											<button
												type="button"
												onClick={() => removeValue(index())}
												class="mb-0.5 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
											>
												Quitar
											</button>
										</li>
									)}
								</For>
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
								<For each={form().commitments}>
									{(commitment, index) => (
										<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
											<Field
												id={`profile-commitment-value-${index()}`}
												label="DATO"
												value={commitment.value}
												onInput={(value) => updateCommitment(index(), 'value', value)}
											/>
											<Field
												id={`profile-commitment-label-${index()}`}
												label="DESCRIPCIÓN"
												value={commitment.label}
												onInput={(value) => updateCommitment(index(), 'label', value)}
											/>
											<button
												type="button"
												onClick={() => removeCommitment(index())}
												class="mb-0.5 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
											>
												Quitar
											</button>
										</li>
									)}
								</For>
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
							type="submit"
							disabled={saving()}
							class="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{saving() ? 'Guardando…' : 'Guardar cambios'}
						</button>
						<Show when={feedback() === 'saved'}>
							<p role="status" class="flex items-center gap-2 text-sm text-foreground">
								<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
								Perfil guardado. La web ya muestra los cambios.
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
		</div>
	);
}
