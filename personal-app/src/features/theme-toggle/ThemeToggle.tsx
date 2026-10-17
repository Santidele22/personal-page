import { createSignal, onMount, Show } from 'solid-js';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
	const [theme, setTheme] = createSignal<Theme>('light');

	onMount(() => {
		setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
	});

	function toggleTheme() {
		const nextTheme: Theme = theme() === 'dark' ? 'light' : 'dark';
		setTheme(nextTheme);
		document.documentElement.classList.toggle('dark', nextTheme === 'dark');
		document.documentElement.style.colorScheme = nextTheme;
		try {
			localStorage.setItem('santi-theme', nextTheme);
		} catch {
			return;
		}
	}

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
			title={theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
			class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-aka hover:text-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<Show
				when={theme() === 'dark'}
				fallback={
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
						<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
					</svg>
				}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
				</svg>
			</Show>
		</button>
	);
}
