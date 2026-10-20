import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import type { AdSlotInfo } from '../types';

/**
 * Cards the landing bands rotate. A sponsor is a brand that already paid for
 * its plan; an offer is a still-available plan rendered with the same design
 * as `AdSlot.astro` (S7). The union is the contract between the pure
 * composition (`features/ad-slot/api/carrusel.ts`) and this island.
 */
export type SponsorCarouselItem =
	| { kind: 'sponsor'; id: number; name: string; imageUrl: string; url?: string | null }
	| { kind: 'offer'; ad: AdSlotInfo };

/** Price segment of a CTA row, already formatted by the ad-slot API mapping. */
export type AdBandPrice = { price: string; cadence: string };

/** Server-rendered band payload: heading, cards and the CTA price segments. */
export type AdBandPayload = {
	variant: 'hero' | 'footer';
	heading: string;
	items: SponsorCarouselItem[];
	/** Highest-priced available hero offer (A2), or `null` with no plan data. */
	featured: AdBandPrice | null;
	/** Available `pie` plan (A1), or `null` when taken/absent. */
	seal: AdBandPrice | null;
};

interface Props {
	items: SponsorCarouselItem[];
	label: string;
}

/** Auto-advance cadence (S8). */
const ADVANCE_MS = 6000;

const ARROW_PATH = 'M5 12h14M12 5l7 7-7 7';

const arrowIcon = (flip: boolean) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={flip ? 'size-3.5 rotate-180' : 'size-3.5'}
		aria-hidden="true"
	>
		<path d={ARROW_PATH} />
	</svg>
);

function OfferCard(props: { ad: AdSlotInfo }) {
	return (
		<div class="flex h-full flex-col justify-between border border-dashed border-border bg-background/60 px-5 py-3.5 transition-colors hover:border-aka/60">
			<div class="flex items-center justify-between gap-2 text-[10px] tracking-[0.18em] text-muted-foreground">
				<span class="font-medium">PUBLICIDAD · DISPONIBLE</span>
				<span class="hidden font-medium text-aka sm:inline">{props.ad.visibility}</span>
			</div>
			<div class="py-3 text-center">
				<p class="font-mincho text-sm font-semibold">Tu marca aquí</p>
				<p class="mt-0.5 font-mono text-[11px] text-muted-foreground">{props.ad.moment}</p>
			</div>
			<div class="flex flex-wrap items-end justify-between gap-2 border-t border-border/70 pt-2.5">
				<span class="font-mincho text-base font-semibold">
					{props.ad.price}
					<span class="text-[11px] font-normal text-muted-foreground"> {props.ad.cadence} · fundador</span>
				</span>
				<a href="/marcas" class="inline-flex items-center gap-1 text-[12px] font-medium text-aka hover:underline">
					Reservar
					{arrowIcon(false)}
				</a>
			</div>
		</div>
	);
}

function SponsorCard(props: { item: Extract<SponsorCarouselItem, { kind: 'sponsor' }> }) {
	const logo = (
		<img
			src={props.item.imageUrl}
			alt={props.item.name}
			loading="lazy"
			decoding="async"
			class="max-h-10 w-auto max-w-[8rem] object-contain"
		/>
	);
	const name = <span class="font-mincho text-sm font-semibold">{props.item.name}</span>;

	return (
		<div class="flex h-full flex-col justify-between border border-border bg-card px-5 py-3.5">
			<div class="flex items-center justify-between gap-2 text-[10px] tracking-[0.18em] text-muted-foreground">
				<span class="font-medium">PUBLICIDAD</span>
				<span class="font-medium text-aka">MARCA AMIGA</span>
			</div>
			<Show
				when={props.item.url}
				fallback={
					<div class="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center">
						{logo}
						{name}
					</div>
				}
			>
				<a
					href={props.item.url as string}
					target="_blank"
					rel="noopener noreferrer"
					class="group flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center"
				>
					{logo}
					<span class="font-mincho text-sm font-semibold group-hover:text-aka">{props.item.name}</span>
					<span class="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-aka">
						Visitar sitio
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-3"
							aria-hidden="true"
						>
							<path d="M7 7h10v10M7 17 17 7" />
						</svg>
					</span>
				</a>
			</Show>
		</div>
	);
}

/**
 * Sponsor/offer carousel for the landing bands (S1, S5, S7, S8). The active
 * card is the only slide rendered, so the first one is useful HTML before the
 * island hydrates. Auto-advance pauses on hover/focus and disappears entirely
 * under `prefers-reduced-motion`, where the controls switch instantly.
 */
export default function SponsorCarousel(props: Props) {
	const [active, setActive] = createSignal(0);
	const [paused, setPaused] = createSignal(false);
	const [reducedMotion, setReducedMotion] = createSignal(false);

	const count = () => props.items.length;

	function go(direction: number) {
		const total = count();
		if (total === 0) return;
		setActive((current) => (current + direction + total) % total);
	}

	onMount(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReducedMotion(query.matches);

		const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
		query.addEventListener('change', onChange);
		onCleanup(() => query.removeEventListener('change', onChange));
	});

	createEffect(() => {
		if (reducedMotion() || paused() || count() < 2) return;

		const timer = window.setInterval(() => {
			setActive((current) => (current + 1) % count());
		}, ADVANCE_MS);

		onCleanup(() => window.clearInterval(timer));
	});

	const item = () => props.items[Math.min(active(), count() - 1)];

	return (
		<div
			role="group"
			aria-roledescription="carrusel"
			aria-label={props.label}
			class="relative"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocusIn={() => setPaused(true)}
			onFocusOut={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
			}}
			onKeyDown={(event) => {
				if (event.key === 'ArrowLeft') go(-1);
				else if (event.key === 'ArrowRight') go(1);
			}}
		>
			<div class="min-h-[10rem]">
				<Show when={item()}>
					{(current) => (
						<div
							role="group"
							aria-roledescription="diapositiva"
							aria-label={`${active() + 1} de ${count()}`}
							class="h-full"
						>
							<Show when={current().kind === 'sponsor'} fallback={<OfferCard ad={(current() as Extract<SponsorCarouselItem, { kind: 'offer' }>).ad} />}>
								<SponsorCard item={current() as Extract<SponsorCarouselItem, { kind: 'sponsor' }>} />
							</Show>
						</div>
					)}
				</Show>
			</div>
			<Show when={count() > 1}>
				<div class="mt-2 flex items-center justify-between gap-3">
					<button
						type="button"
						aria-label="Tarjeta anterior"
						onClick={() => go(-1)}
						class="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-aka hover:text-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors"
					>
						{arrowIcon(true)}
					</button>
					<div class="flex items-center gap-1.5">
						<For each={props.items}>
							{(_, index) => (
								<button
									type="button"
									aria-label={`Ir a la tarjeta ${index() + 1}`}
									aria-current={index() === active() ? 'true' : undefined}
									onClick={() => setActive(index())}
									class={[
										'size-2 rounded-full motion-safe:transition-colors',
										index() === active() ? 'bg-aka' : 'bg-border hover:bg-muted-foreground',
									].join(' ')}
								/>
							)}
						</For>
					</div>
					<button
						type="button"
						aria-label="Tarjeta siguiente"
						onClick={() => go(1)}
						class="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-aka hover:text-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-colors"
					>
						{arrowIcon(false)}
					</button>
				</div>
			</Show>
		</div>
	);
}
