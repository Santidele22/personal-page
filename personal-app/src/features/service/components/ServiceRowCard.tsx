import { For, Show } from 'solid-js';
import type { AdminServiceRow } from '../api/services-admin';
import { servicePriceLabel } from '../serviceForm';
import type { ServiceFormState } from '../serviceForm';
import {
	ServiceFeedback,
	ServiceFields,
	serviceDangerButtonClass,
	servicePrimaryButtonClass,
	serviceSecondaryButtonClass,
} from './ServiceFields';
import type { ServiceNotice } from './ServiceFields';

export type ServiceRowCardProps = {
	row: AdminServiceRow;
	editing: boolean;
	confirmingDelete: boolean;
	/** A delete of this row is in flight: the confirm button shows its pending label. */
	deleting: boolean;
	/** Any delete is in flight: every confirm button stays locked, like before the split. */
	pendingDelete: boolean;
	/** A save of this row is in flight. */
	saving: boolean;
	form: ServiceFormState;
	notice: ServiceNotice | null;
	onInput: <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored service: summary with its features, inline editor, and two-step delete. */
export function ServiceRowCard(props: ServiceRowCardProps) {
	return (
		<li class="px-6 py-5">
			<Show
				when={props.editing}
				fallback={
					<div>
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div class="min-w-0">
								<p class="font-mincho text-xl font-semibold tracking-tight">{props.row.name}</p>
								<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
									{props.row.description}
								</p>
							</div>
							<p class="font-mono text-[12px] text-muted-foreground">{servicePriceLabel(props.row)}</p>
						</div>

						<Show when={props.row.features.length > 0}>
							<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
								<For each={props.row.features}>
									{(feature) => (
										<li class="text-[12px] text-muted-foreground">· {feature}</li>
									)}
								</For>
							</ul>
						</Show>

						<div class="mt-4 flex flex-wrap items-center gap-3">
							<button type="button" onClick={props.onStartEdit} class={serviceSecondaryButtonClass}>
								Editar
							</button>
							<Show
								when={props.confirmingDelete}
								fallback={
									<button
										type="button"
										onClick={props.onRequestDelete}
										class={serviceDangerButtonClass}
									>
										Eliminar
									</button>
								}
							>
								<span class="flex flex-wrap items-center gap-3">
									<span class="text-[12px] text-muted-foreground">¿Eliminar este servicio?</span>
									<button
										type="button"
										disabled={props.pendingDelete}
										onClick={props.onConfirmDelete}
										class={`${serviceDangerButtonClass} border-destructive/50 text-destructive`}
									>
										{props.deleting ? 'Eliminando…' : 'Sí, eliminar'}
									</button>
									<button
										type="button"
										onClick={props.onCancelDelete}
										class={serviceSecondaryButtonClass}
									>
										Cancelar
									</button>
								</span>
							</Show>
						</div>
					</div>
				}
			>
				<form
					onSubmit={props.onSubmitEdit}
					class="grid gap-5"
					aria-label={`Editar ${props.row.name}`}
				>
					<ServiceFields
						form={props.form}
						prefix={`service-edit-${props.row.id}`}
						onInput={props.onInput}
					/>
					<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
						<button
							type="submit"
							disabled={props.saving}
							class={`${servicePrimaryButtonClass} h-10 px-5`}
						>
							{props.saving ? 'Guardando…' : 'Guardar cambios'}
						</button>
						<button
							type="button"
							disabled={props.saving}
							onClick={props.onCancelEdit}
							class={serviceSecondaryButtonClass}
						>
							Cancelar
						</button>
						<ServiceFeedback notice={props.notice} />
					</div>
				</form>
			</Show>
		</li>
	);
}
