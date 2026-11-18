import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { AdminDeleteButton } from './AdminDeleteButton';
import { adminCardClass, adminPrimaryButtonClass, adminRowButtonClass } from './styles';

export type AdminEditableRowCardProps = {
	editing: boolean;
	confirmingDelete: boolean;
	confirmDeletePrompt: string;
	pending?: boolean;
	summary: JSX.Element;
	editFields: JSX.Element;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** List item shell supporting read summary, inline edit form, and two-step delete confirmation. */
export function AdminEditableRowCard(props: AdminEditableRowCardProps) {
	return (
		<li class={adminCardClass}>
			<Show
				when={props.editing}
				fallback={
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0">{props.summary}</div>
						<div class="flex shrink-0 flex-wrap items-center gap-2">
							<Show when={!props.confirmingDelete}>
								<button
									type="button"
									disabled={props.pending}
									onClick={props.onStartEdit}
									class={adminRowButtonClass}
								>
									Editar
								</button>
							</Show>
							<AdminDeleteButton
								confirming={props.confirmingDelete}
								confirmPrompt={props.confirmDeletePrompt}
								pending={props.pending}
								onRequestDelete={props.onRequestDelete}
								onConfirmDelete={props.onConfirmDelete}
								onCancelDelete={props.onCancelDelete}
							/>
						</div>
					</div>
				}
			>
				<form onSubmit={props.onSubmitEdit} class="grid gap-5">
					{props.editFields}
					<div class="flex flex-wrap items-center gap-2">
						<button type="submit" disabled={props.pending} class={adminPrimaryButtonClass}>
							{props.pending ? 'Guardando…' : 'Guardar cambios'}
						</button>
						<button
							type="button"
							disabled={props.pending}
							onClick={props.onCancelEdit}
							class={adminRowButtonClass}
						>
							Cancelar
						</button>
					</div>
				</form>
			</Show>
		</li>
	);
}
