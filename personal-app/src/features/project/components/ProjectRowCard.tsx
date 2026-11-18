import { For, Show } from 'solid-js';
import type { AdminProjectRow } from '../api/projects-admin';
import { projectStatusLabel } from '../projectForm';
import type { ProjectFormState } from '../projectForm';
import {
	ProjectFeedback,
	ProjectFields,
	projectBadgeClass,
	projectDangerButtonClass,
	projectPrimaryButtonClass,
	projectSecondaryButtonClass,
} from './ProjectFields';
import type { ProjectNotice } from './ProjectFields';

export type ProjectRowCardProps = {
	row: AdminProjectRow;
	editing: boolean;
	confirmingDelete: boolean;
	/** A delete of this row is in flight: the confirm button shows its pending label. */
	deleting: boolean;
	/** Any delete is in flight: every confirm button stays locked, like before the split. */
	pendingDelete: boolean;
	/** A save of this row is in flight. */
	saving: boolean;
	form: ProjectFormState;
	notice: ProjectNotice | null;
	onInput: <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored project: summary with its badges and technologies, inline editor, two-step delete. */
export function ProjectRowCard(props: ProjectRowCardProps) {
	return (
		<li class="px-6 py-5">
			<Show
				when={props.editing}
				fallback={
					<div>
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div class="min-w-0">
								<p class="font-mincho text-xl font-semibold tracking-tight">{props.row.name}</p>
								<Show when={props.row.tagline}>
									<p class="mt-1 text-sm text-foreground">{props.row.tagline}</p>
								</Show>
								<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
									{props.row.description}
								</p>
							</div>
							<p class="max-w-[16rem] truncate font-mono text-[12px] text-muted-foreground">
								{props.row.url}
							</p>
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-2">
							<Show when={props.row.status}>
								<span class={projectBadgeClass}>
									{projectStatusLabel(props.row.status as string)}
								</span>
							</Show>
							<Show when={props.row.featured === true}>
								<span class={projectBadgeClass}>Destacado</span>
							</Show>
							<Show when={props.row.githubUrl}>
								<span class="max-w-[16rem] truncate font-mono text-[11px] text-muted-foreground">
									{props.row.githubUrl}
								</span>
							</Show>
						</div>

						<Show when={props.row.technologies.length > 0}>
							<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
								<For each={props.row.technologies}>
									{(technology) => (
										<li class="text-[12px] text-muted-foreground">· {technology}</li>
									)}
								</For>
							</ul>
						</Show>

						<div class="mt-4 flex flex-wrap items-center gap-3">
							<button type="button" onClick={props.onStartEdit} class={projectSecondaryButtonClass}>
								Editar
							</button>
							<Show
								when={props.confirmingDelete}
								fallback={
									<button
										type="button"
										onClick={props.onRequestDelete}
										class={projectDangerButtonClass}
									>
										Eliminar
									</button>
								}
							>
								<span class="flex flex-wrap items-center gap-3">
									<span class="text-[12px] text-muted-foreground">¿Eliminar este proyecto?</span>
									<button
										type="button"
										disabled={props.pendingDelete}
										onClick={props.onConfirmDelete}
										class={`${projectDangerButtonClass} border-destructive/50 text-destructive`}
									>
										{props.deleting ? 'Eliminando…' : 'Sí, eliminar'}
									</button>
									<button type="button" onClick={props.onCancelDelete} class={projectSecondaryButtonClass}>
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
					<ProjectFields
						form={props.form}
						prefix={`project-edit-${props.row.id}`}
						onInput={props.onInput}
					/>
					<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
						<button
							type="submit"
							disabled={props.saving}
							class={`${projectPrimaryButtonClass} h-10 px-5`}
						>
							{props.saving ? 'Guardando…' : 'Guardar cambios'}
						</button>
						<button
							type="button"
							disabled={props.saving}
							onClick={props.onCancelEdit}
							class={projectSecondaryButtonClass}
						>
							Cancelar
						</button>
						<ProjectFeedback notice={props.notice} />
					</div>
				</form>
			</Show>
		</li>
	);
}
