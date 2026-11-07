import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { toDiarioPosts } from '../../entities/admin/adapter';
import type { AdminSummaryStat, ApiBlog } from '../../entities/admin/types';
import { deleteBlogEntry, updateBlogEntry } from '../../features/admin/api/diario';
import { loadDiarioPanel } from '../../features/admin/api/dashboards';

/**
 * Diario panel island (issue 29). The published table stays server-rendered
 * in the page; this island owns everything the server render cannot know
 * because it needs the browser admin credential: the drafts read and the live
 * summary with the real draft count.
 *
 * Writing moved to dedicated full-page routes (design artboard 02):
 * «+ Nueva entrada» and every row «Editar» navigate to
 * `/admin/diario/nueva` / `/admin/diario/<id>`; this island keeps the drafts
 * table, the row «Publicar» shortcut and the delete confirm dialog. Every
 * mutation reloads the page, which keeps the server table and this island
 * honest with storage on the same pass.
 */

type Status = 'loading' | 'ready' | 'error';
/** `null` = no mutation in flight; the drafts row and the confirm dialog share it. */
type Pending = 'draft' | 'publish' | 'row' | null;

/** The entry waiting on the confirm dialog; `id` is the only mandatory handle. */
type DeleteTarget = {
	id: number;
	title: string;
	isPublished: boolean;
};

const DOT_CLASS: Record<AdminSummaryStat['dot'], string> = {
	neutral: 'bg-foreground/60',
	hollow: 'border border-muted-foreground',
	aka: 'bg-aka',
};

const secondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const badgeClass =
	'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground';
const dangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-[12px] font-medium text-[#fdf8ee] transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60';
const headClass = 'py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const cellClass = 'py-4';

/** UTC date of the browser day, the same `yyyy-mm-dd` the date input emits. */
function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

/** The API message when there is one; the panel would rather show it raw. */
function messageFrom(cause: unknown): string {
	return cause instanceof Error && cause.message ? cause.message : '';
}

export default function DiarioEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [stats, setStats] = createSignal<AdminSummaryStat[]>([]);
	const [drafts, setDrafts] = createSignal<ApiBlog[]>([]);
	const [loadDetail, setLoadDetail] = createSignal('');
	const [actionError, setActionError] = createSignal('');

	const [pending, setPending] = createSignal<Pending>(null);
	const [deleteTarget, setDeleteTarget] = createSignal<DeleteTarget | null>(null);
	const [deleting, setDeleting] = createSignal(false);
	const [deleteError, setDeleteError] = createSignal('');

	const draftPosts = () => toDiarioPosts(drafts());
	const draftById = (id: string) => drafts().find((draft) => String(draft.id) === id);

	async function load() {
		setStatus('loading');
		setLoadDetail('');
		setActionError('');

		try {
			const data = await loadDiarioPanel();
			setStats(data.stats);
			setDrafts(data.drafts);
			setStatus('ready');
		} catch (cause) {
			setLoadDetail(messageFrom(cause));
			setStatus('error');
		}
	}

	onMount(() => {
		void load();

		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;

			if (deleting()) return;
			if (deleteTarget() !== null) {
				closeDelete();
			}
		};
		document.addEventListener('keydown', onKey);

		// Bridge for the published table's «Eliminar»: the row id and title
		// arrive in the event detail and the confirm dialog takes over.
		const onRequestDelete = (event: Event) => {
			const detail = (event as CustomEvent<{ id?: string; title?: string }>).detail;
			const id = Number(detail?.id);

			// Same one-crew rule as the drafts table: a mutation in flight wins.
			if (deleting() || pending() !== null) return;

			if (detail?.id && Number.isInteger(id)) {
				setDeleteError('');
				setDeleteTarget({
					id,
					title: detail?.title ?? 'Entrada publicada',
					isPublished: true,
				});
			}
		};
		document.addEventListener('diario:request-delete', onRequestDelete);

		onCleanup(() => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('diario:request-delete', onRequestDelete);
		});
	});

	async function publishDraft(draft: ApiBlog) {
		if (pending() !== null) return;

		setPending('row');
		setActionError('');

		try {
			await updateBlogEntry(draft.id, { pubDate: todayIso() });
			window.location.reload();
		} catch (cause) {
			setActionError(messageFrom(cause) || 'No se pudo publicar el borrador. Inténtalo de nuevo.');
			setPending(null);
		}
	}

	/** Opens the confirm dialog for a draft row action. */
	function requestDelete(draft: ApiBlog) {
		// One crew at a time: while another mutation submits, deleting is
		// paused so a reload can never race a still-in-flight save.
		if (deleting() || pending() !== null) return;

		setDeleteError('');
		setDeleteTarget({ id: draft.id, title: draft.title, isPublished: false });
	}

	function closeDelete() {
		if (deleting()) return;
		setDeleteTarget(null);
	}

	/**
	 * Runs the confirmed deletion. The reload keeps both tables honest with
	 * storage, the same pass every other mutation uses.
	 */
	async function confirmDelete() {
		const target = deleteTarget();

		if (target === null || deleting()) return;

		setDeleting(true);
		setDeleteError('');

		try {
			await deleteBlogEntry(target.id);
			window.location.reload();
		} catch (cause) {
			setDeleteError(messageFrom(cause) || 'No se pudo eliminar la entrada. Inténtalo de nuevo.');
			setDeleting(false);
		}
	}

	return (
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los borradores…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los borradores del panel. Revisá la sesión del admin e inténtalo de nuevo.
					</p>
					<Show when={loadDetail()}>
						<p class="font-mono text-[11px] leading-relaxed text-destructive">{loadDetail()}</p>
					</Show>
					<button type="button" onClick={() => void load()} class={`${secondaryButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<section aria-label="Resumen de entradas" class="border border-border bg-card px-6 py-4">
					<p class="flex flex-wrap items-baseline gap-x-8 gap-y-2">
						<For each={stats()}>
							{(stat) => (
								<span class="flex items-baseline gap-3">
									<span class={`size-1.5 rounded-full ${DOT_CLASS[stat.dot]}`} aria-hidden="true" />
									<span class="font-mincho text-2xl font-semibold">{stat.value}</span>
									<span class="text-sm text-muted-foreground">{stat.label}</span>
								</span>
							)}
						</For>
					</p>
				</section>

				<section aria-labelledby="diario-borradores" class="overflow-hidden border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="diario-borradores" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							BORRADORES
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{drafts().length} {drafts().length === 1 ? 'borrador' : 'borradores'}
						</p>
					</header>

					<Show when={actionError()}>
						<div class="border-b border-border px-6 py-3">
							<p role="alert" class="text-sm text-destructive">
								{actionError()}
							</p>
						</div>
					</Show>

					<Show
						when={drafts().length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								No hay borradores abiertos. Todo lo que escribas sin fecha queda acá hasta que lo publiques.
							</p>
						}
					>
						<div class="overflow-x-auto">
							<table class="w-full min-w-[680px] text-left text-sm">
								<caption class="sr-only">Borradores del diario con su estado y fecha de guardado</caption>
								<thead>
									<tr class="border-b border-border">
										<th scope="col" class={`${headClass} px-6`}>
											ENTRADA
										</th>
										<th scope="col" class={`${headClass} px-4`}>
											ESTADO
										</th>
										<th scope="col" class={`${headClass} px-4`}>
											FECHA
										</th>
										<th scope="col" class={`${headClass} px-6 text-right`}>
											ACCIONES
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									<For each={draftPosts()}>
										{(post) => {
											const draft = draftById(post.id);

											return (
												<tr class="group transition-colors hover:bg-secondary/50">
													<th scope="row" class={`${cellClass} max-w-sm px-6 font-sans font-normal`}>
														<span class="block truncate font-medium">{post.title}</span>
														<span class="mt-0.5 block font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
															{post.category}
														</span>
													</th>
													<td class={`${cellClass} whitespace-nowrap px-4`}>
														<span class="flex items-center gap-2">
															<span class="size-1.5 rounded-full border border-muted-foreground" aria-hidden="true" />
															<span class={badgeClass}>Borrador</span>
														</span>
													</td>
													<td class={`${cellClass} whitespace-nowrap px-4 font-mono text-[13px] text-muted-foreground`}>
														{post.date}
													</td>
													<td class={`${cellClass} px-6 text-right`}>
														<span class="inline-flex flex-wrap items-center justify-end gap-2">
															<a href={`/admin/diario/${post.id}`} class={secondaryButtonClass}>
																Editar
															</a>
															<button
																type="button"
																disabled={pending() !== null}
																onClick={() => draft && void publishDraft(draft)}
																class={secondaryButtonClass}
															>
																{pending() === 'row' ? 'Publicando…' : 'Publicar'}
															</button>
															<button
																type="button"
																disabled={deleting() || pending() !== null}
																onClick={() => draft && requestDelete(draft)}
																class={`${secondaryButtonClass} hover:border-destructive hover:bg-destructive/10 hover:text-destructive`}
															>
																Eliminar
															</button>
														</span>
													</td>
												</tr>
											);
										}}
									</For>
								</tbody>
							</table>
						</div>
					</Show>
				</section>
			</Show>

			{/*
				Delete confirmation. Both entry kinds land here — the drafts
				table through `requestDelete` and the server-rendered
				published table through the document event bridge — so the
				call to `DELETE /blogs/:id` happens behind an explicit
				"Eliminar" and never from a stray click.
			*/}
			<Show when={deleteTarget() !== null}>
				<div
					class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
					role="presentation"
					onClick={(event) => {
						if (event.target === event.currentTarget) closeDelete();
					}}
				>
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="diario-delete-title"
						aria-describedby="diario-delete-description"
						class="w-full max-w-md border border-border bg-card p-6 shadow-xl"
					>
						<p class="text-[11px] font-medium tracking-[0.3em] text-destructive">ELIMINAR ENTRADA</p>
						<h2 id="diario-delete-title" class="mt-2 font-mincho text-2xl font-semibold tracking-tight">
							¿Eliminar esta entrada?
						</h2>
						<p id="diario-delete-description" class="mt-3 text-sm leading-relaxed text-muted-foreground">
							«{deleteTarget()?.title}»
							{deleteTarget()?.isPublished ? ' está publicada. ' : ' es un borrador abierto. '}
							La entrada se borra del diario por completo y la acción no se puede deshacer.
						</p>

						<Show when={deleteError()}>
							<p role="alert" class="mt-3 border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-destructive">
								{deleteError()}
							</p>
						</Show>

						<div class="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
							<button type="button" disabled={deleting()} onClick={() => void confirmDelete()} class={dangerButtonClass}>
								{deleting() ? 'Eliminando…' : 'Eliminar'}
							</button>
							<button type="button" disabled={deleting()} onClick={closeDelete} class={`${secondaryButtonClass} ml-auto`}>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
