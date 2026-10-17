import { createSignal, For, onMount, Show } from 'solid-js';
import { fetchSubscriberCounts, fetchSubscribers } from './api/subscribers';
import type { Subscriber, SubscriberCountByMonth, SubscribersStatus } from './types';

const MONTH_FORMAT = new Intl.DateTimeFormat('es-ES', { month: 'short' });

/** `2026-10` → `OCT`. */
function monthLabel(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	return MONTH_FORMAT.format(new Date(Date.UTC(year, monthNumber - 1, 1)))
		.replace('.', '')
		.toUpperCase();
}

/** ISO timestamp → `2026.10.15` (the format the panel already uses). */
function formatDate(iso: string): string {
	return iso.slice(0, 10).replace(/-/g, '.');
}

/** Shown while the admin list is loading or after a failed read. */
export default function SubscribersPanel() {
	const [status, setStatus] = createSignal<SubscribersStatus>('loading');
	const [subscribers, setSubscribers] = createSignal<Subscriber[]>([]);
	const [counts, setCounts] = createSignal<SubscriberCountByMonth[]>([]);

	async function load() {
		setStatus('loading');
		try {
			const [list, byMonth] = await Promise.all([
				fetchSubscribers(),
				fetchSubscriberCounts(),
			]);
			setSubscribers(list);
			setCounts(byMonth);
			setStatus('ready');
		} catch {
			// The API message can be raw (for example `Unauthorized`); the panel
			// always answers in Spanish and offers a retry instead.
			setStatus('error');
		}
	}

	onMount(() => {
		void load();
	});

	const total = () => subscribers().length;
	const currentMonth = () => new Date().toISOString().slice(0, 7);
	const signupsThisMonth = () =>
		counts().find((entry) => entry.month === currentMonth())?.count ?? 0;
	const recentCounts = () => counts().slice(-8);
	const recentMax = () =>
		Math.max(1, ...recentCounts().map((entry) => entry.count));
	const latest = () => subscribers().slice(0, 10);

	const kpis = () => [
		{ id: 'totales', label: 'Totales', value: String(total()), note: 'suscriptores en la lista' },
		{ id: 'altas', label: 'Altas este mes', value: `+${signupsThisMonth()}`, note: 'desde la web' },
	];

	return (
		<div class="flex flex-col gap-8" aria-live="polite">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando suscriptores…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar los suscriptores. Inténtalo de nuevo en unos minutos.</p>
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
				<section aria-label="Indicadores de suscriptores" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<For each={kpis()}>
						{(kpi) => (
							<article class="border border-border bg-card p-5 sm:p-6">
								<p class="pt-1 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">{kpi.label}</p>
								<p class="mt-4 font-mincho text-3xl font-semibold tracking-tight sm:text-4xl">{kpi.value}</p>
								<p class="mt-2 text-xs text-muted-foreground">{kpi.note}</p>
							</article>
						)}
					</For>
				</section>

				<section aria-label="Altas por mes" class="border border-border bg-card p-6">
					<header class="flex items-baseline justify-between gap-4">
						<h2 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">ALTAS POR MES — ÚLTIMOS 8 MESES</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{total() === 0 ? 'sin altas todavía' : `${total()} ${total() === 1 ? 'alta' : 'altas'} en total`}
						</p>
					</header>
					<Show
						when={recentCounts().length > 0}
						fallback={<p class="mt-8 text-sm text-muted-foreground">Todavía no hay altas registradas.</p>}
					>
						<div class="mt-8 flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label="Altas por mes de los últimos 8 meses">
							<For each={recentCounts()}>
								{(entry, index) => {
									const isNewest = index() === recentCounts().length - 1;
									return (
										<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
											<p class={isNewest ? 'text-xs font-semibold text-aka' : 'text-xs text-muted-foreground'}>{entry.count}</p>
											<div
												class={`w-full rounded-t-[4px] transition-opacity ${isNewest ? 'bg-aka' : 'bg-aka/20'}`}
												style={{ height: `${Math.max(2, (entry.count / recentMax()) * 92)}%` }}
											/>
											<p class="font-mono text-[10px] tracking-wider text-muted-foreground">{monthLabel(entry.month)}</p>
										</div>
									);
								}}
							</For>
						</div>
					</Show>
				</section>

				<section aria-label={`Últimas altas — ${total()}`} class="overflow-hidden border border-border bg-card">
					<header class="flex items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">ÚLTIMAS ALTAS</h2>
						<p class="font-mono text-[11px] text-muted-foreground">{latest().length} de {total()}</p>
					</header>
					<Show
						when={total() > 0}
						fallback={<p class="px-6 py-6 text-sm text-muted-foreground">Todavía no hay suscriptores.</p>}
					>
						<div class="overflow-x-auto">
							<table class="w-full min-w-[720px] text-left text-sm">
								<caption class="sr-only">Suscriptores recientes con correo, nombre, origen y fecha</caption>
								<thead>
									<tr class="border-b border-border">
										<th scope="col" class="px-6 py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">CORREO</th>
										<th scope="col" class="px-4 py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">NOMBRE</th>
										<th scope="col" class="px-4 py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">ORIGEN</th>
										<th scope="col" class="px-4 py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">FECHA</th>
										<th scope="col" class="px-6 py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground">ESTADO</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									<For each={latest()}>
										{(subscriber) => (
											<tr class="transition-colors hover:bg-secondary/50">
												<td class="max-w-[220px] truncate px-6 py-4 font-mono text-[13px]">{subscriber.email}</td>
												<td class="whitespace-nowrap px-4 py-4">{subscriber.name ?? '—'}</td>
												<td class="whitespace-nowrap px-4 py-4 text-muted-foreground">{subscriber.origin ?? 'Newsletter'}</td>
												<td class="whitespace-nowrap px-4 py-4 font-mono text-[13px] text-muted-foreground">{formatDate(subscriber.createdAt)}</td>
												<td class="whitespace-nowrap px-6 py-4">
													<span class="flex items-center gap-2">
														<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
														Activo
													</span>
												</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</Show>
				</section>
			</Show>
		</div>
	);
}
