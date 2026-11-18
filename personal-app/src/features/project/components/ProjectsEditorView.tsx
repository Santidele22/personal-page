import { For, Show } from 'solid-js';
import type { AdminPanelStatus } from '../../../shared/lib/adminPanel';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import { adminHintClass, adminSectionHeadingClass } from '../../../shared/ui/admin/styles';
import type { AdminProjectRow } from '../api/projects-admin';
import { projectCountLabel } from '../projectForm';
import type { ProjectFormState } from '../projectForm';
import {
	ProjectFeedback,
	ProjectFields,
	projectPrimaryButtonClass,
} from './ProjectFields';
import type { ProjectNotice } from './ProjectFields';
import { ProjectRowCard } from './ProjectRowCard';

export type ProjectsEditorViewProps = {
	status: AdminPanelStatus;
	projects: readonly AdminProjectRow[];
	creating: boolean;
	editingId: number | null;
	confirmingDeleteId: number | null;
	deletingId: number | null;
	savingEdit: boolean;
	newForm: ProjectFormState;
	draftForm: ProjectFormState;
	/** Feedback of the add form, of the row being edited, and of the last delete. */
	createNotice: ProjectNotice | null;
	editNotice: ProjectNotice | null;
	deleteNotice: ProjectNotice | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => void;
	onDraftInput: <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => void;
	onStartEdit: (row: AdminProjectRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the projects admin CRUD panel. */
export function ProjectsEditorView(props: ProjectsEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando los proyectos…"
				errorText="No pudimos cargar los proyectos. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<section aria-labelledby="proyectos-nuevo" class="border border-border bg-card p-6">
					<h2 id="proyectos-nuevo" class={adminSectionHeadingClass}>
						NUEVO PROYECTO
					</h2>
					<p class={adminHintClass}>Se agrega al final de la lista; la landing lo muestra al recargar.</p>
					<form onSubmit={props.onCreateSubmit} class="mt-5 grid gap-5">
						<ProjectFields form={props.newForm} prefix="project-new" onInput={props.onNewInput} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={props.creating} class={projectPrimaryButtonClass}>
								{props.creating ? 'Agregando…' : 'Agregar proyecto'}
							</button>
							<ProjectFeedback notice={props.createNotice} />
						</div>
					</form>
				</section>

				<section aria-labelledby="proyectos-lista" class="border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="proyectos-lista" class={adminSectionHeadingClass}>
							PROYECTOS PUBLICADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{props.projects.length} {projectCountLabel(props.projects.length)}
						</p>
					</header>

					<Show when={props.deleteNotice}>
						<div class="border-b border-border px-6 py-3">
							<ProjectFeedback notice={props.deleteNotice} />
						</div>
					</Show>

					<Show
						when={props.projects.length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								Todavía no hay proyectos cargados. En la web la sección queda sin tarjetas hasta que publiques uno.
							</p>
						}
					>
						<ul class="divide-y divide-border">
							<For each={props.projects}>
								{(row) => (
									<ProjectRowCard
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
