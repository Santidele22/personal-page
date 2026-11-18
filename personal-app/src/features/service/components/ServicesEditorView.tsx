import { For, Show } from 'solid-js';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import { adminHintClass } from '../../../shared/ui/admin/styles';
import type { AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { AdminServiceRow } from '../api/services-admin';
import { serviceCountLabel } from '../serviceForm';
import type { ServiceFormState } from '../serviceForm';
import {
	ServiceFeedback,
	ServiceFields,
	servicePrimaryButtonClass,
} from './ServiceFields';
import type { ServiceNotice } from './ServiceFields';
import { ServiceRowCard } from './ServiceRowCard';

export type ServicesEditorViewProps = {
	status: AdminPanelStatus;
	services: readonly AdminServiceRow[];
	creating: boolean;
	editingId: number | null;
	confirmingDeleteId: number | null;
	deletingId: number | null;
	savingEdit: boolean;
	newForm: ServiceFormState;
	draftForm: ServiceFormState;
	/** Feedback of the add form, of the row being edited, and of the last delete. */
	createNotice: ServiceNotice | null;
	editNotice: ServiceNotice | null;
	deleteNotice: ServiceNotice | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => void;
	onDraftInput: <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => void;
	onStartEdit: (row: AdminServiceRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the services admin CRUD panel. */
export function ServicesEditorView(props: ServicesEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando los servicios…"
				errorText="No pudimos cargar los servicios. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<section aria-labelledby="servicios-nuevo" class="border border-border bg-card p-6">
					<h2
						id="servicios-nuevo"
						class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground"
					>
						NUEVO SERVICIO
					</h2>
					<p class={adminHintClass}>
						Se agrega al final de la lista; la landing lo muestra al recargar.
					</p>
					<form onSubmit={props.onCreateSubmit} class="mt-5 grid gap-5">
						<ServiceFields form={props.newForm} prefix="service-new" onInput={props.onNewInput} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={props.creating} class={servicePrimaryButtonClass}>
								{props.creating ? 'Agregando…' : 'Agregar servicio'}
							</button>
							<ServiceFeedback notice={props.createNotice} />
						</div>
					</form>
				</section>

				<section aria-labelledby="servicios-lista" class="border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2
							id="servicios-lista"
							class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground"
						>
							SERVICIOS PUBLICADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{props.services.length} {serviceCountLabel(props.services.length)}
						</p>
					</header>

					<Show when={props.deleteNotice}>
						<div class="border-b border-border px-6 py-3">
							<ServiceFeedback notice={props.deleteNotice} />
						</div>
					</Show>

					<Show
						when={props.services.length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								Todavía no hay servicios cargados. La web muestra los que trae de fábrica hasta que
								agregues uno.
							</p>
						}
					>
						<ul class="divide-y divide-border">
							<For each={props.services}>
								{(row) => (
									<ServiceRowCard
										row={row}
										editing={props.editingId === row.id}
										confirmingDelete={props.confirmingDeleteId === row.id}
										deleting={props.deletingId === row.id}
										pendingDelete={props.deletingId !== null}
										saving={props.savingEdit}
										form={props.draftForm}
										notice={props.editNotice}
										onInput={props.onDraftInput}
										onStartEdit={() => props.onStartEdit(row)}
										onCancelEdit={props.onCancelEdit}
										onSubmitEdit={(event) => props.onSubmitEdit(event, row.id)}
										onRequestDelete={() => props.onRequestDelete(row.id)}
										onConfirmDelete={() => props.onConfirmDelete(row.id)}
										onCancelDelete={props.onCancelDelete}
									/>
								)}
							</For>
						</ul>
					</Show>
				</section>
			</AdminStatusGate>
		</div>
	);
}
