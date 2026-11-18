import { For, Show } from 'solid-js';
import { adminHintClass } from '../../../shared/ui/admin/styles';
import type { AdvertisingPlan } from '../api/advertising-admin';
import { publicPlanRows } from '../advertisingPlanForm';
import type { AdvertisingPlanFormState } from '../advertisingPlanForm';
import { AdvertisingPlanForm, planQuietButtonClass } from './AdvertisingPlanFields';

const requestDeleteClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive';

const confirmDeleteClass =
	'inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-[12px] font-medium text-[#fdf8ee] transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export type AdvertisingPlanRowCardProps = {
	plan: AdvertisingPlan;
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	form: AdvertisingPlanFormState;
	error: string;
	onInput: (key: keyof AdvertisingPlanFormState, value: string) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored plan: summary with its public face, inline edit, and two-step delete. */
export function AdvertisingPlanRowCard(props: AdvertisingPlanRowCardProps) {
	return (
		<li class="border border-border bg-card p-6">
			<Show
				when={props.editing}
				fallback={
					<>
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p class="font-mono text-[11px] text-muted-foreground">PLAN #{props.plan.id}</p>
								<p class="mt-2 text-sm">{props.plan.description}</p>
							</div>
							<p class="shrink-0 text-right">
								<span class="block font-mincho text-2xl font-semibold tracking-tight">
									USD {props.plan.price}
								</span>
								<span class="mt-1 block text-[10px] tracking-[0.25em] text-muted-foreground">PRECIO</span>
							</p>
						</div>

						<Show
							when={publicPlanRows(props.plan).length > 0}
							fallback={
								<p class={adminHintClass}>
									Sin cara pública: la landing no muestra este plan hasta que le des un slug.
								</p>
							}
						>
							<dl class="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
								<For each={publicPlanRows(props.plan)}>
									{(row) => (
										<div class="flex gap-2 text-[12px]">
											<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">
												{row.label}
											</dt>
											<dd class="text-foreground">{row.value}</dd>
										</div>
									)}
								</For>
							</dl>
						</Show>

						<div class="mt-5 flex flex-wrap items-center gap-3">
							<button type="button" onClick={props.onStartEdit} class={planQuietButtonClass}>
								Editar
							</button>
							<Show
								when={props.confirmingDelete}
								fallback={
									<button type="button" onClick={props.onRequestDelete} class={requestDeleteClass}>
										Eliminar
									</button>
								}
							>
								<span class="text-[12px] text-muted-foreground">
									Se borra de la base y la landing deja de mostrarlo.
								</span>
								<button
									type="button"
									disabled={props.pending}
									onClick={props.onConfirmDelete}
									class={confirmDeleteClass}
								>
									{props.pending ? 'Eliminando…' : 'Sí, eliminar'}
								</button>
								<button type="button" onClick={props.onCancelDelete} class={planQuietButtonClass}>
									Cancelar
								</button>
							</Show>
						</div>
					</>
				}
			>
				<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
					EDITAR PLAN #{props.plan.id}
				</h3>
				<div class="mt-5">
					<AdvertisingPlanForm
						prefix={`plan-${props.plan.id}`}
						form={props.form}
						submitLabel="Guardar plan"
						pending={props.pending}
						error={props.error}
						onInput={props.onInput}
						onSubmit={props.onSubmitEdit}
						onCancel={props.onCancelEdit}
					/>
				</div>
			</Show>
		</li>
	);
}
