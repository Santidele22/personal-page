import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import type { NavLink } from '../../app/config/site';

interface Props {
	links: NavLink[];
}

export default function MobileNavigation(props: Props) {
	const [open, setOpen] = createSignal(false);

	onMount(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('keydown', closeOnEscape);
		onCleanup(() => document.removeEventListener('keydown', closeOnEscape));
	});

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open()}
				aria-controls="mobile-navigation"
				aria-label={open() ? 'Cerrar menú' : 'Abrir menú'}
				class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card md:hidden"
			>
				<Show
					when={open()}
					fallback={
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="size-4" aria-hidden="true">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="size-4" aria-hidden="true">
						<path d="m18 6-12 12M6 6l12 12" />
					</svg>
				</Show>
			</button>
			<Show when={open()}>
				<nav id="mobile-navigation" aria-label="Menú móvil" class="absolute inset-x-0 top-full border-b border-border bg-background px-5 pb-5 pt-3 md:hidden">
					<ul class="flex flex-col gap-1">
						<For each={props.links}>
							{(link) => (
								<li>
									<a href={link.href} onClick={() => setOpen(false)} class="block rounded-md px-3 py-2.5 text-[15px] text-foreground/90 transition-colors hover:bg-secondary hover:text-aka">
										{link.label}
									</a>
								</li>
							)}
						</For>
						<li>
							<a href="/#contacto" onClick={() => setOpen(false)} class="block rounded-md px-3 py-2.5 text-[15px] font-medium text-aka transition-colors hover:bg-secondary">
								Escribime
							</a>
						</li>
					</ul>
				</nav>
			</Show>
		</>
	);
}
