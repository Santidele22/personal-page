import { Show } from 'solid-js';
import type { ProfileCommitment } from '../types';
import type {
	ProfileEditorFeedback,
	ProfileEditorPending,
	ProfileEditorStatus,
	ProfileFormState,
	ProfileValueForm,
} from '../profileForm';
import { ProfileActionBar } from './ProfileActionBar';
import { ProfileDiscardDialog } from './ProfileDiscardDialog';
import {
	ProfileAboutSection,
	ProfileContactFooterSection,
	ProfileHeroSection,
	ProfileIdentitySection,
	ProfileNetworksSection,
	ProfileSiteMetaSection,
} from './ProfileEditorSections';
import {
	ProfileCommitmentsSection,
	ProfileValuesSection,
} from './ProfileParagraphGroups';
import { profileDraftDiscardButtonClass, profileRetryButtonClass } from './ProfileFields';

export type ProfileEditorViewProps = {
	status: ProfileEditorStatus;
	form: ProfileFormState;
	/** A stored draft exists, so the notice and its discard action show. */
	hasDraft: boolean;
	pending: ProfileEditorPending;
	feedback: ProfileEditorFeedback;
	canSaveDraft: boolean;
	canPublish: boolean;
	confirmingDiscard: boolean;
	onRetry: () => void;
	onInput: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
	onValueInput: (index: number, field: keyof ProfileValueForm, value: string) => void;
	onAddValue: () => void;
	onRemoveValue: (index: number) => void;
	onCommitmentInput: (index: number, field: keyof ProfileCommitment, value: string) => void;
	onAddCommitment: () => void;
	onRemoveCommitment: (index: number) => void;
	onSubmit: (event: SubmitEvent) => void;
	onSaveDraft: (event: MouseEvent) => void;
	onRequestDiscard: () => void;
	onConfirmDiscard: () => void;
	onCancelDiscard: () => void;
};

/** Presentational view of the singleton profile editor panel. */
export function ProfileEditorView(props: ProfileEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<Show when={props.status === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando el perfil…
				</p>
			</Show>

			<Show when={props.status === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar el perfil. Inténtalo de nuevo en unos minutos.</p>
					<button type="button" onClick={props.onRetry} class={profileRetryButtonClass}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={props.status === 'ready'}>
				<form onSubmit={props.onSubmit} class="flex flex-col gap-8">
					<Show when={props.hasDraft}>
						<div
							role="note"
							class="flex flex-wrap items-center gap-4 border border-border bg-card px-6 py-4"
						>
							<p class="flex items-center gap-2 text-sm text-foreground">
								<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
								Tenés un borrador sin publicar. La web sigue mostrando el perfil publicado.
							</p>
							<button
								type="button"
								disabled={props.pending !== null}
								onClick={props.onRequestDiscard}
								class={profileDraftDiscardButtonClass}
							>
								Descartar borrador
							</button>
						</div>
					</Show>

					<ProfileIdentitySection form={props.form} onInput={props.onInput} />
					<ProfileHeroSection form={props.form} onInput={props.onInput} />
					<ProfileAboutSection form={props.form} onInput={props.onInput} />
					<ProfileValuesSection
						values={props.form.values}
						onInput={props.onValueInput}
						onAdd={props.onAddValue}
						onRemove={props.onRemoveValue}
					/>
					<ProfileCommitmentsSection
						commitments={props.form.commitments}
						onInput={props.onCommitmentInput}
						onAdd={props.onAddCommitment}
						onRemove={props.onRemoveCommitment}
					/>
					<ProfileSiteMetaSection form={props.form} onInput={props.onInput} />
					<ProfileNetworksSection form={props.form} onInput={props.onInput} />
					<ProfileContactFooterSection form={props.form} onInput={props.onInput} />

					<ProfileActionBar
						pending={props.pending}
						feedback={props.feedback}
						canSaveDraft={props.canSaveDraft}
						canPublish={props.canPublish}
						onSaveDraft={props.onSaveDraft}
					/>
				</form>
			</Show>

			{/*
				The discard dialog only mounts while it is open; it opens only from
				the notice's «Descartar borrador» and never from a stray click.
			*/}
			<Show when={props.confirmingDiscard}>
				<ProfileDiscardDialog
					pending={props.pending}
					onConfirm={props.onConfirmDiscard}
					onCancel={props.onCancelDiscard}
				/>
			</Show>
		</div>
	);
}
