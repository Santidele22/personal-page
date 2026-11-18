import { AdminField } from '../../../shared/ui/admin/AdminField';
import { AdminSelectField } from '../../../shared/ui/admin/AdminSelectField';
import type { RoadmapStageState } from '../api/roadmap-admin';
import { ROADMAP_STAGE_STATE_OPTIONS } from '../roadmapForm';
import type { StageFormState } from '../roadmapForm';
import { RoadmapNumberField } from './RoadmapNumberField';

export type RoadmapStageFieldsProps = {
	form: StageFormState;
	prefix: string;
	onInput: <K extends keyof StageFormState>(key: K, value: StageFormState[K]) => void;
};

/** The fields of one stage, shared by the add form and the inline editor. */
export function RoadmapStageFields(props: RoadmapStageFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<AdminField
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Backend II"
				onInput={(value) => props.onInput('title', value)}
			/>
			<AdminField
				id={`${props.prefix}-techs`}
				label="TECNOLOGÍAS"
				value={props.form.techs}
				placeholder="NestJS, PostgreSQL, Docker"
				hint="Separadas por comas; se muestran como chips en el nodo."
				onInput={(value) => props.onInput('techs', value)}
			/>
			<div class="sm:col-span-2">
				<AdminField
					id={`${props.prefix}-summary`}
					label="RESUMEN"
					value={props.form.summary}
					multiline
					rows={3}
					onInput={(value) => props.onInput('summary', value)}
				/>
			</div>
			<AdminSelectField
				id={`${props.prefix}-state`}
				label="ESTADO"
				value={props.form.state}
				options={ROADMAP_STAGE_STATE_OPTIONS}
				onInput={(value) => props.onInput('state', value as RoadmapStageState)}
			/>
			<RoadmapNumberField
				id={`${props.prefix}-progress`}
				label="PROGRESO (0–100)"
				value={props.form.progress}
				hint="El anillo del nodo muestra este porcentaje; 0 en las etapas que todavía no empezaron."
				onInput={(value) => props.onInput('progress', value)}
			/>
			<RoadmapNumberField
				id={`${props.prefix}-position`}
				label="POSICIÓN"
				value={props.form.position}
				placeholder="Al final"
				hint="La más chica va primero; si la dejas vacía, el backend decide el lugar."
				onInput={(value) => props.onInput('position', value)}
			/>
		</div>
	);
}
