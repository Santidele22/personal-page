import { AdminField } from '../../../shared/ui/admin/AdminField';
import type { RecommendationFormState } from '../recommendationForm';

export type RecommendationFieldsProps = {
	form: RecommendationFormState;
	prefix: string;
	disabled?: boolean;
	onInput: <K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) => void;
};

/** Shared field grid for creating and inline-editing a recommendation. */
export function RecommendationFields(props: RecommendationFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<AdminField
					id={`${props.prefix}-quote`}
					label="CITA"
					value={props.form.quote}
					multiline
					rows={4}
					placeholder="Tengo la oportunidad de trabajar con Santiago…"
					disabled={props.disabled}
					onInput={(value) => props.onInput('quote', value)}
				/>
			</div>
			<AdminField
				id={`${props.prefix}-author`}
				label="NOMBRE"
				value={props.form.authorName}
				placeholder="Carlos Fabian Lencina"
				disabled={props.disabled}
				onInput={(value) => props.onInput('authorName', value)}
			/>
			<AdminField
				id={`${props.prefix}-role`}
				label="ROL"
				value={props.form.authorRole}
				placeholder="CTO | Blockchain & AI Engineer"
				disabled={props.disabled}
				onInput={(value) => props.onInput('authorRole', value)}
			/>
			<AdminField
				id={`${props.prefix}-relationship`}
				label="RELACIÓN"
				value={props.form.relationship}
				placeholder="Me supervisó directamente"
				hint="Cómo trabajó con vos; se muestra junto a la fecha en la tarjeta."
				disabled={props.disabled}
				onInput={(value) => props.onInput('relationship', value)}
			/>
			<AdminField
				id={`${props.prefix}-linkedin`}
				label="LINK DE LINKEDIN"
				value={props.form.linkedinUrl}
				placeholder="https://www.linkedin.com/in/…"
				hint="URL completa (https://…) o vacío si la tarjeta no muestra enlace."
				disabled={props.disabled}
				onInput={(value) => props.onInput('linkedinUrl', value)}
			/>
			<AdminField
				id={`${props.prefix}-position`}
				label="POSICIÓN"
				type="number"
				value={props.form.position}
				placeholder="Al final"
				hint="La más chica va primero; si la dejas vacía, el backend decide el lugar."
				disabled={props.disabled}
				onInput={(value) => props.onInput('position', value)}
			/>
		</div>
	);
}
