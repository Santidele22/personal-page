import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import type { AdminRoadmapMilestoneRow } from '../api/roadmap-admin';
import { roadmapMilestoneStatusLabel } from '../roadmapForm';
import type { MilestoneFormState } from '../roadmapForm';
import { RoadmapMilestoneFields } from './RoadmapMilestoneFields';

export type RoadmapMilestoneRowCardProps = {
	row: AdminRoadmapMilestoneRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	form: MilestoneFormState;
	onInput: <K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored milestone: the list entry, the inline editor, and two-step delete. */
export function RoadmapMilestoneRowCard(props: RoadmapMilestoneRowCardProps) {
	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt={`¿Eliminar el hito «${props.row.title}»?`}
			pending={props.pending}
			summary={
				<>
					<p class="truncate font-medium">{props.row.title}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{props.row.summary || 'Sin resumen.'}
					</p>
					<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
						#{props.row.position} · {props.row.quarter} · {roadmapMilestoneStatusLabel(props.row.status)}
					</p>
				</>
			}
			editFields={
				<RoadmapMilestoneFields
					form={props.form}
					prefix={`milestone-edit-${props.row.id}`}
					onInput={props.onInput}
				/>
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
