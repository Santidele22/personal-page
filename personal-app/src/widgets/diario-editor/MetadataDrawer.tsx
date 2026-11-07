import { createSignal, For } from 'solid-js';
import type { ApiBlogLevel } from '../../entities/admin/types';

/**
 * Metadata drawer of the full-page editor: segmented level, category chips
 * (the backend keeps one `category` column, so chips serialize joined with
 * `, `), featured switch, auto readMin and the slug preview derived from the
 * title. Presentation only; the page owns the form state.
 */

const LEVELS: { value: ApiBlogLevel; label: string }[] = [
	{ value: 'basico', label: 'Básico' },
	{ value: 'intermedio', label: 'Intermedio' },
	{ value: 'avanzado', label: 'Avanzado' },
];

type Props = {
	open: () => boolean;
	onClose: () => void;
	level: () => ApiBlogLevel;
	onSelectLevel: (level: ApiBlogLevel) => void;
	categories: () => string[];
	onAddCategory: (raw: string) => void;
	onRemoveCategory: (index: number) => void;
	featured: () => boolean;
	onToggleFeatured: () => void;
	readMin: () => number;
	slugPath: () => string;
};

export default function MetadataDrawer(props: Props) {
	const [chip, setChip] = createSignal('');

	const addChip = () => {
		const value = chip().trim();
		if (!value) return;
		props.onAddCategory(value);
		setChip('');
	};

	return (
		<aside class="meta-drawer" classList={{ open: props.open() }} aria-label="Metadatos del post">
			<h2>
				Metadatos{' '}
				<button type="button" class="drawer-close" onClick={props.onClose} aria-label="Cerrar">
					✕
				</button>
			</h2>

			<div class="field">
				<label>Nivel</label>
				<div class="segmented" role="group" aria-label="Nivel del artículo">
					<For each={LEVELS}>
						{(option) => (
							<button
								type="button"
								classList={{ active: props.level() === option.value }}
								aria-pressed={props.level() === option.value}
								onClick={() => props.onSelectLevel(option.value)}
							>
								{option.label}
							</button>
						)}
					</For>
				</div>
			</div>

			<div class="field">
				<label>Categorías</label>
				<div class="chips">
					<For each={props.categories()}>
						{(name, index) => (
							<span class="chip-x">
								{name}{' '}
								<button type="button" aria-label={`Quitar ${name}`} onClick={() => props.onRemoveCategory(index())}>
									✕
								</button>
							</span>
						)}
					</For>
					<input
						class="chip-input"
						placeholder="+ agregar"
						aria-label="Agregar categoría"
						value={chip()}
						onInput={(event) => setChip(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								addChip();
							}
						}}
					/>
				</div>
			</div>

			<div class="field">
				<div class="switch-row">
					<span>Destacado en home</span>
					<button
						type="button"
						class="switch"
						classList={{ on: props.featured() }}
						role="switch"
						aria-checked={props.featured()}
						aria-label="Destacado en home"
						onClick={props.onToggleFeatured}
					/>
				</div>
			</div>

			<div class="field">
				<label>Tiempo de lectura</label>
				<p class="auto-value">~{props.readMin()} min</p>
				<p class="auto-note">
					Se calcula solo del conteo de palabras (~200 wpm) y viaja en <span class="slug-value">readMin</span>.
				</p>
			</div>

			<div class="field">
				<label>Slug (auto del título)</label>
				<p class="slug-value">{props.slugPath()}</p>
				<p class="auto-note">Se deriva del título al crear la entrada; después conserva el slug y su URL.</p>
			</div>

			<p class="auto-note" style={{ 'margin-top': '24px' }}>
				Los metadatos se guardan junto con el borrador.
			</p>
		</aside>
	);
}
