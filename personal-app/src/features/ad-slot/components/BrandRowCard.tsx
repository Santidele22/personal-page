import { Show } from 'solid-js';
import type { ApiBrand } from '../../../entities/admin/types';
import type { AdvertisingPlan } from '../api/advertising-admin';
import { planLabel, validityOf } from '../brandForm';
import type { BrandFormState } from '../brandForm';
import { BrandForm, brandQuietButtonClass } from './BrandFields';

const requestDeleteClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive';

const confirmDeleteClass =
	'inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-[12px] font-medium text-[#fdf8ee] transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export type BrandRowCardProps = {
	brand: ApiBrand;
	plans: readonly AdvertisingPlan[];
	editing: boolean;
	confirmingDelete: boolean;
	pending: boolean;
	form: BrandFormState;
	error: string;
	onInput: <K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent) => void;
	onRequestDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
};

/** One stored brand: logo summary, inline edit, and two-step delete. */
export function BrandRowCard(props: BrandRowCardProps) {
	const validity = () => validityOf(props.brand, new Date());

	return (
		<li class="border border-border bg-card p-6">
			<Show
				when={props.editing}
				fallback={
					<>
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div class="flex min-w-0 gap-4">
								<img
									src={props.brand.imageUrl}
									alt={`Logo de ${props.brand.name}`}
									class="size-14 shrink-0 rounded-md border border-border bg-background object-contain p-1.5"
								/>
								<div class="min-w-0">
									<p class="font-mono text-[11px] text-muted-foreground">MARCA #{props.brand.id}</p>
									<p class="mt-2 font-mincho text-xl font-semibold tracking-tight">{props.brand.name}</p>
									<dl class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
										<div class="flex gap-2">
											<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">PLAN</dt>
											<dd class="text-foreground">{planLabel(props.plans, props.brand.planId)}</dd>
										</div>
										<div class="flex gap-2">
											<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">VIGENCIA</dt>
											<dd class={validity().active ? 'text-foreground' : 'text-destructive'}>
												{validity().text}
											</dd>
										</div>
										<Show when={props.brand.url}>
											<div class="flex min-w-0 gap-2">
												<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">ENLACE</dt>
												<dd class="break-all text-foreground">{props.brand.url}</dd>
											</div>
										</Show>
									</dl>
								</div>
							</div>
						</div>

						<div class="mt-5 flex flex-wrap items-center gap-3">
							<button type="button" onClick={props.onStartEdit} class={brandQuietButtonClass}>
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
									Se borra de la base y el carrusel deja de mostrarla. Si el plan todavía la referencia,
									el backend rechaza el borrado.
								</span>
								<button
									type="button"
									disabled={props.pending}
									onClick={props.onConfirmDelete}
									class={confirmDeleteClass}
								>
									{props.pending ? 'Eliminando…' : 'Sí, eliminar'}
								</button>
								<button type="button" onClick={props.onCancelDelete} class={brandQuietButtonClass}>
									Cancelar
								</button>
							</Show>
						</div>
					</>
				}
			>
				<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
					EDITAR MARCA #{props.brand.id}
				</h3>
				<div class="mt-5">
					<BrandForm
						prefix={`brand-${props.brand.id}`}
						form={props.form}
						plans={props.plans}
						submitLabel="Guardar marca"
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
