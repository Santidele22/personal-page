import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import type { AdminRecommendationRow } from '../api/recommendations-admin';
import type { RecommendationFormState } from '../recommendationForm';
import { RecommendationFields } from './RecommendationFields';

export type RecommendationRowCardProps = {
	row: AdminRecommendationRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	draftForm: RecommendationFormState;
	onDraftInput: <K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** Single recommendation item supporting read summary, inline edit, and delete confirmation. */
export function RecommendationRowCard(props: RecommendationRowCardProps) {
	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt={`¿Eliminar la recomendación de «${props.row.authorName}»?`}
			pending={props.pending}
			onStartEdit={props.onStartEdit}
			onCancelEdit={props.onCancelEdit}
			onSubmitEdit={props.onSubmitEdit}
			onRequestDelete={props.onRequestDelete}
			onConfirmDelete={props.onConfirmDelete}
			onCancelDelete={props.onCancelDelete}
			summary={
				<>
					<p class="truncate font-medium">{props.row.authorName}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{props.row.authorRole} · {props.row.relationship}
					</p>
					<p class="mt-1.5 line-clamp-2 text-sm italic leading-relaxed text-muted-foreground">
						«{props.row.quote}»
					</p>
					<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
						#{props.row.position} · {props.row.linkedinUrl ? 'Con link de LinkedIn' : 'Sin link de LinkedIn'}
					</p>
				</>
			}
			editFields={
				<RecommendationFields
					form={props.draftForm}
					prefix={`recommendation-edit-${props.row.id}`}
					disabled={props.pending}
					onInput={props.onDraftInput}
				/>
			}
		/>
	);
}
