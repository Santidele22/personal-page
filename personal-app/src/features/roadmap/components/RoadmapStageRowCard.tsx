import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import { parseTechs } from '../api/roadmap-admin';
import type { AdminRoadmapStageRow } from '../api/roadmap-admin';
import { roadmapStageStateLabel } from '../roadmapForm';
import type { StageFormState } from '../roadmapForm';
import { RoadmapStageFields } from './RoadmapStageFields';

export type RoadmapStageRowCardProps = {
	row: AdminRoadmapStageRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	form: StageFormState;
	onInput: <K extends keyof StageFormState>(key: K, value: StageFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored stage: the node in words, the inline editor, and two-step delete. */
export function RoadmapStageRowCard(props: RoadmapStageRowCardProps) {
	const techsText = () => parseTechs(props.row.techs).join(', ') || 'Sin tecnologías';

	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt={`¿Eliminar la etapa «${props.row.title}»?`}
			pending={props.pending}
			summary={
				<>
					<p class="truncate font-medium">{props.row.title}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{props.row.summary || 'Sin resumen.'}
					</p>
					<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
						#{props.row.position} · {roadmapStageStateLabel(props.row.state)} · {props.row.progress}% ·{' '}
						{techsText()}
					</p>
				</>
			}
			editFields={
				<RoadmapStageFields form={props.form} prefix={`stage-edit-${props.row.id}`} onInput={props.onInput} />
			}
			onStartEdit={props.onStartEdit}
			onCancelEdit={props.onCancelEdit}
			onSubmitEdit={props.onSubmitEdit}
			onRequestDelete={props.onRequestDelete}
			onConfirmDelete={props.onConfirmDelete}
			onCancelDelete={props.onCancelDelete}
		/>
	);
}
