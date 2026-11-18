import { AdminEditableRowCard } from '../../../shared/ui/admin/AdminEditableRowCard';
import type { ToolRow } from '../api/tools-admin';
import { sponsorshipLabel } from '../toolForm';
import type { ToolFormState } from '../toolForm';
import { ToolFields } from './ToolFields';

export type ToolRowCardProps = {
	row: ToolRow;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	draftForm: ToolFormState;
	onDraftInput: <K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** Single tool item supporting read summary, inline edit, and delete confirmation. */
export function ToolRowCard(props: ToolRowCardProps) {
	return (
		<AdminEditableRowCard
			editing={props.editing}
			confirmingDelete={props.confirmingDelete}
			confirmDeletePrompt={`¿Eliminar «${props.row.name}»?`}
			pending={props.pending}
			onStartEdit={props.onStartEdit}
			onCancelEdit={props.onCancelEdit}
			onSubmitEdit={props.onSubmitEdit}
			onRequestDelete={props.onRequestDelete}
			onConfirmDelete={props.onConfirmDelete}
			onCancelDelete={props.onCancelDelete}
			summary={
				<>
					<p class="truncate font-medium">{props.row.name}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{props.row.what || 'Sin nota.'}
					</p>
					<p class="mt-1.5 text-[12px] text-muted-foreground">
						{sponsorshipLabel(props.row.sponsorship ?? 'genuina')}
					</p>
				</>
			}
			editFields={
				<ToolFields
					form={props.draftForm}
					prefix={`tool-edit-${props.row.id}`}
					disabled={props.pending}
					onInput={props.onDraftInput}
				/>
			}
		/>
	);
}
