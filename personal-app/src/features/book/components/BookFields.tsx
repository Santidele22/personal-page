import { AdminField } from '../../../shared/ui/admin/AdminField';
import { AdminSelectField } from '../../../shared/ui/admin/AdminSelectField';
import { adminHintClass } from '../../../shared/ui/admin/styles';
import { BOOK_KIND_OPTIONS, BOOK_STATUS_OPTIONS } from '../bookForm';
import type { BookFormState } from '../bookForm';

export type BookFieldsProps = {
	form: BookFormState;
	prefix: string;
	disabled?: boolean;
	onInput: <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => void;
};

/** Shared field grid for creating and inline-editing a book. */
export function BookFields(props: BookFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<AdminField
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				disabled={props.disabled}
				onInput={(value) => props.onInput('title', value)}
			/>
			<AdminField
				id={`${props.prefix}-author`}
				label="AUTOR"
				value={props.form.author}
				placeholder="Quién lo escribió"
				disabled={props.disabled}
				onInput={(value) => props.onInput('author', value)}
			/>
			<div class="sm:col-span-2">
				<AdminField
					id={`${props.prefix}-description`}
					label="DESCRIPCIÓN"
					value={props.form.description}
					multiline
					rows={3}
					disabled={props.disabled}
					onInput={(value) => props.onInput('description', value)}
				/>
			</div>
			<AdminSelectField
				id={`${props.prefix}-status`}
				label="ESTADO"
				value={props.form.status}
				options={BOOK_STATUS_OPTIONS}
				disabled={props.disabled}
				onInput={(value) => props.onInput('status', value)}
			/>
			<AdminSelectField
				id={`${props.prefix}-kind`}
				label="CATEGORÍA"
				value={props.form.kind}
				options={BOOK_KIND_OPTIONS}
				hint="Aparece en el apartado de libros técnicos o no técnicos de la web."
				disabled={props.disabled}
				onInput={(value) => props.onInput('kind', value)}
			/>
			<div class="sm:col-span-2">
				<AdminField
					id={`${props.prefix}-review`}
					label="RESEÑA"
					value={props.form.review}
					multiline
					rows={4}
					hint="Opcional: si la dejás vacía, el libro se muestra sin comentario."
					disabled={props.disabled}
					onInput={(value) => props.onInput('review', value)}
				/>
			</div>
			<div class="sm:col-span-2">
				<label class="flex w-fit items-center gap-3">
					<input
						type="checkbox"
						checked={props.form.published}
						disabled={props.disabled}
						onChange={(event) => props.onInput('published', event.currentTarget.checked)}
						class="size-4 rounded-sm border border-border bg-background accent-aka disabled:cursor-not-allowed disabled:opacity-60"
					/>
					<span class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">PUBLICADO</span>
				</label>
				<p class={adminHintClass}>Solo los publicados aparecen en la web y se pueden descargar.</p>
			</div>
		</div>
	);
}
