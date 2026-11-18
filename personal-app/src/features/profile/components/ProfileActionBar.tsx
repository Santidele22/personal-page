import { Show } from 'solid-js';
import type { ProfileEditorFeedback, ProfileEditorPending } from '../profileForm';
import { profilePublishButtonClass, profileSaveDraftButtonClass } from './ProfileFields';

/**
 * The form's action bar: draft save, publish, and the inline answer of the last
 * mutation. The panel owns the lifecycle; this module only renders it.
 */

export type ProfileActionBarProps = {
	pending: ProfileEditorPending;
	feedback: ProfileEditorFeedback;
	canSaveDraft: boolean;
	canPublish: boolean;
	onSaveDraft: (event: MouseEvent) => void;
};

export function ProfileActionBar(props: ProfileActionBarProps) {
	return (
		<div class="flex flex-wrap items-center gap-4 border-t border-border pt-6">
			<button
				type="button"
				disabled={!props.canSaveDraft}
				onClick={props.onSaveDraft}
				class={profileSaveDraftButtonClass}
			>
				{props.pending === 'draft' ? 'Guardando el borrador…' : 'Guardar borrador'}
			</button>
			<button type="submit" disabled={!props.canPublish} class={profilePublishButtonClass}>
				{props.pending === 'publish' ? 'Publicando…' : 'Publicar'}
			</button>
			<Show when={props.feedback === 'draftSaved'}>
				<p role="status" class="flex items-center gap-2 text-sm text-foreground">
					<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
					Borrador guardado. La web sigue mostrando el perfil publicado.
				</p>
			</Show>
			<Show when={props.feedback === 'published'}>
				<p role="status" class="flex items-center gap-2 text-sm text-foreground">
					<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
					Perfil publicado. La web ya muestra los cambios.
				</p>
			</Show>
			<Show when={props.feedback === 'discarded'}>
				<p role="status" class="flex items-center gap-2 text-sm text-foreground">
					<span class="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
					Borrador descartado. El formulario volvió al perfil publicado.
				</p>
			</Show>
			<Show when={props.feedback === 'error'}>
				<p role="alert" class="text-sm text-destructive">
					No pudimos guardar el perfil. Inténtalo de nuevo en unos minutos.
				</p>
			</Show>
		</div>
	);
}
