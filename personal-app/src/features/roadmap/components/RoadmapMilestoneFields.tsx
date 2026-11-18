import { AdminField } from '../../../shared/ui/admin/AdminField';
import { AdminSelectField } from '../../../shared/ui/admin/AdminSelectField';
import type { RoadmapMilestoneStatus } from '../api/roadmap-admin';
import { ROADMAP_MILESTONE_STATUS_OPTIONS } from '../roadmapForm';
import type { MilestoneFormState } from '../roadmapForm';
import { RoadmapNumberField } from './RoadmapNumberField';

export type RoadmapMilestoneFieldsProps = {
	form: MilestoneFormState;
	prefix: string;
	onInput: <K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) => void;
};

/** The fields of one milestone, shared by the add form and the inline editor. */
export function RoadmapMilestoneFields(props: RoadmapMilestoneFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<AdminField
				id={`${props.prefix}-quarter`}
				label="TRIMESTRE"
				value={props.form.quarter}
				placeholder="Q3 · 2026"
				onInput={(value) => props.onInput('quarter', value)}
			/>
			<AdminField
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Primer contrato inteligente auditado"
				onInput={(value) => props.onInput('title', value)}
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
				id={`${props.prefix}-status`}
				label="ESTADO"
				value={props.form.status}
				options={ROADMAP_MILESTONE_STATUS_OPTIONS}
				onInput={(value) => props.onInput('status', value as RoadmapMilestoneStatus)}
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
