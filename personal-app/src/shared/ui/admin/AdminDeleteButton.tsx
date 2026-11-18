import { Show } from 'solid-js';
import { adminDangerButtonClass, adminRowButtonClass } from './styles';

export type AdminDeleteButtonProps = {
	confirming: boolean;
	confirmPrompt: string;
	pending?: boolean;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** Two-step inline confirmation for destructive row actions inside admin lists. */
export function AdminDeleteButton(props: AdminDeleteButtonProps) {
	return (
		<Show
			when={props.confirming}
			fallback={
				<button
					type="button"
					disabled={props.pending}
					onClick={props.onRequestDelete}
					class={adminDangerButtonClass}
				>
					Eliminar
				</button>
			}
		>
			<span class="text-[12px] text-muted-foreground">{props.confirmPrompt}</span>
			<button
				type="button"
				disabled={props.pending}
				onClick={props.onConfirmDelete}
				class={adminDangerButtonClass}
			>
				Sí, eliminar
			</button>
			<button
				type="button"
				disabled={props.pending}
				onClick={props.onCancelDelete}
				class={adminRowButtonClass}
			>
				Cancelar
			</button>
		</Show>
	);
}
