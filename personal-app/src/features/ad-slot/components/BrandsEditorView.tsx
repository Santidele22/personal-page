import { For, Show } from 'solid-js';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { ApiBrand } from '../../../entities/admin/types';
import type { AdvertisingPlan } from '../api/advertising-admin';
import type { BrandFormState } from '../brandForm';
import { BrandForm, brandQuietButtonClass } from './BrandFields';
import { BrandRowCard } from './BrandRowCard';

/** Whichever form a validation message belongs to: the create card or a stored row. */
export type BrandFormTarget = 'create' | number;

export type BrandsEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	brands: readonly ApiBrand[];
	plans: readonly AdvertisingPlan[];
	pending: boolean;
	creating: boolean;
	editingId: number | null;
	confirmingDeleteId: number | null;
	newForm: BrandFormState;
	draftForm: BrandFormState;
	/** Failure of the last save, shared by whichever form is open. */
	saveError: string;
	validationError: { target: BrandFormTarget; message: string } | null;
	onRetry: () => void;
	onToggleCreate: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onCancelCreate: () => void;
	onNewInput: <K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) => void;
	onDraftInput: <K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) => void;
	onStartEdit: (brand: ApiBrand) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (brand: ApiBrand) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the brands admin CRUD panel. */
export function BrandsEditorView(props: BrandsEditorViewProps) {
	/**
	 * A rejected submit answers in the form that sent it, so a message for the
	 * create card never shows up inside a row being edited.
	 */
	function errorFor(target: BrandFormTarget): string {
		const current = props.validationError;

		return (current && current.target === target ? current.message : '') || props.saveError;
	}

	const notice = () => (props.feedback.kind === 'idle' ? null : props.feedback);

	return (
		<div class="flex flex-col gap-6">
			<Show when={props.status === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando las marcas…
				</p>
			</Show>

			<Show when={props.status === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar las marcas. La web sigue mostrando lo último guardado.
					</p>
					<button type="button" onClick={props.onRetry} class={brandQuietButtonClass}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={props.status === 'ready'}>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						{props.brands.length === 1 ? '1 marca guardada.' : `${props.brands.length} marcas guardadas.`}
					</p>
					<button type="button" onClick={props.onToggleCreate} class={brandQuietButtonClass}>
						{props.creating ? 'Cerrar formulario' : '+ Añadir marca'}
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
						<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">NUEVA MARCA</h3>
						<div class="mt-5">
							<BrandForm
								prefix="brand-nueva"
								form={props.newForm}
								plans={props.plans}
								submitLabel="Añadir marca"
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
					when={props.brands.length > 0}
					fallback={
						<p class="border border-dashed border-border p-6 text-sm text-muted-foreground">
							Todavía no hay marcas. Añade la primera y los carruseles empezarán a mostrar sponsors.
						</p>
					}
				>
					<ul class="flex flex-col gap-4">
						<For each={props.brands}>
							{(brand) => (
								<BrandRowCard
									brand={brand}
									plans={props.plans}
									editing={props.editingId === brand.id}
									confirmingDelete={props.confirmingDeleteId === brand.id}
									pending={props.pending}
									form={props.draftForm}
									error={errorFor(brand.id)}
									onInput={props.onDraftInput}
									onStartEdit={() => props.onStartEdit(brand)}
									onCancelEdit={props.onCancelEdit}
									onSubmitEdit={(event) => props.onSubmitEdit(event, brand.id)}
									onRequestDelete={() => props.onRequestDelete(brand.id)}
									onConfirmDelete={() => props.onConfirmDelete(brand)}
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
