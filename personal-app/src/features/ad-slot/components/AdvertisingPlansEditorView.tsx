import { For, Show } from 'solid-js';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { AdvertisingPlan } from '../api/advertising-admin';
import type { AdvertisingPlanFormState } from '../advertisingPlanForm';
import { AdvertisingPlanForm, planQuietButtonClass } from './AdvertisingPlanFields';
import { AdvertisingPlanRowCard } from './AdvertisingPlanRowCard';

/** Whichever form a validation message belongs to: the create card or a stored row. */
export type AdvertisingPlanFormTarget = 'create' | number;

export type AdvertisingPlansEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	plans: readonly AdvertisingPlan[];
	pending: boolean;
	creating: boolean;
	editingId: number | null;
	confirmingDeleteId: number | null;
	newForm: AdvertisingPlanFormState;
	draftForm: AdvertisingPlanFormState;
	/** Failure of the last save, shared by whichever form is open. */
	saveError: string;
	validationError: { target: AdvertisingPlanFormTarget; message: string } | null;
	onRetry: () => void;
	onToggleCreate: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onCancelCreate: () => void;
	onNewInput: (key: keyof AdvertisingPlanFormState, value: string) => void;
	onDraftInput: (key: keyof AdvertisingPlanFormState, value: string) => void;
	onStartEdit: (plan: AdvertisingPlan) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (plan: AdvertisingPlan) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the advertising-plans admin CRUD panel. */
export function AdvertisingPlansEditorView(props: AdvertisingPlansEditorViewProps) {
	/**
	 * A rejected submit answers in the form that sent it, so a message for the
	 * create card never shows up inside a row being edited.
	 */
	function errorFor(target: AdvertisingPlanFormTarget): string {
		const current = props.validationError;

		return (current && current.target === target ? current.message : '') || props.saveError;
	}

	const notice = () => (props.feedback.kind === 'idle' ? null : props.feedback);

	return (
		<div class="flex flex-col gap-6">
			<Show when={props.status === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los planes de publicidad…
				</p>
			</Show>

			<Show when={props.status === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los planes. La web sigue mostrando lo último guardado.
					</p>
					<button type="button" onClick={props.onRetry} class={planQuietButtonClass}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={props.status === 'ready'}>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						{props.plans.length === 1 ? '1 plan guardado.' : `${props.plans.length} planes guardados.`}
					</p>
					<button type="button" onClick={props.onToggleCreate} class={planQuietButtonClass}>
						{props.creating ? 'Cerrar formulario' : '+ Añadir plan'}
					</button>
				</div>

				<Show when={notice()} keyed>
					{(current) => (
						<p
							role={current.kind === 'error' ? 'alert' : 'status'}
							class={`border p-4 text-sm ${
								current.kind === 'error'
									? 'border-destructive/40 bg-destructive/10 text-destructive'
									: 'border-border bg-card text-foreground'
							}`}
						>
							{current.message}
						</p>
					)}
				</Show>

				<Show when={props.creating}>
					<div class="border border-border bg-card p-6">
						<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">NUEVO PLAN</h3>
						<div class="mt-5">
							<AdvertisingPlanForm
								prefix="plan-nuevo"
								form={props.newForm}
								submitLabel="Añadir plan"
								pending={props.pending}
								error={errorFor('create')}
								onInput={props.onNewInput}
								onSubmit={props.onCreateSubmit}
								onCancel={props.onCancelCreate}
							/>
						</div>
					</div>
				</Show>

				<Show
					when={props.plans.length > 0}
					fallback={
						<p class="border border-dashed border-border p-6 text-sm text-muted-foreground">
							Todavía no hay planes guardados. Añade el primero y la landing empezará a mostrar el slot.
						</p>
					}
				>
					<ul class="flex flex-col gap-4">
						<For each={props.plans}>
							{(plan) => (
								<AdvertisingPlanRowCard
									plan={plan}
									editing={props.editingId === plan.id}
									confirmingDelete={props.confirmingDeleteId === plan.id}
									pending={props.pending}
									form={props.draftForm}
									error={errorFor(plan.id)}
									onInput={props.onDraftInput}
									onStartEdit={() => props.onStartEdit(plan)}
									onCancelEdit={props.onCancelEdit}
									onSubmitEdit={(event) => props.onSubmitEdit(event, plan.id)}
									onRequestDelete={() => props.onRequestDelete(plan.id)}
									onConfirmDelete={() => props.onConfirmDelete(plan)}
									onCancelDelete={props.onCancelDelete}
								/>
							)}
						</For>
					</ul>
				</Show>
			</Show>
		</div>
	);
}
