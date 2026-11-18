import type { ProfileEditorPending } from '../profileForm';
import {
	profileCancelDiscardButtonClass,
	profileConfirmDiscardButtonClass,
} from './ProfileFields';

/**
 * The discard confirmation dialog. It stays unmounted while closed and only
 * opens from the draft notice's «Descartar borrador», never from a stray click:
 * a backdrop click is treated as a cancel, like the panel always did.
 */

export type ProfileDiscardDialogProps = {
	pending: ProfileEditorPending;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ProfileDiscardDialog(props: ProfileDiscardDialogProps) {
	return (
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
			role="presentation"
			onClick={(event) => {
				if (event.target === event.currentTarget) props.onCancel();
			}}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="perfil-discard-title"
				aria-describedby="perfil-discard-description"
				class="w-full max-w-md border border-border bg-card p-6 shadow-xl"
			>
				<p class="text-[11px] font-medium tracking-[0.3em] text-destructive">DESCARTAR BORRADOR</p>
				<h2 id="perfil-discard-title" class="mt-2 font-mincho text-2xl font-semibold tracking-tight">
					¿Descartar el borrador?
				</h2>
				<p id="perfil-discard-description" class="mt-3 text-sm leading-relaxed text-muted-foreground">
					Los cambios guardados en el borrador se pierden por completo, la web sigue mostrando el perfil
					publicado y la acción no se puede deshacer.
				</p>

				<div class="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
					<button
						type="button"
						disabled={props.pending === 'discard'}
						onClick={props.onConfirm}
						class={profileConfirmDiscardButtonClass}
					>
						{props.pending === 'discard' ? 'Descartando…' : 'Descartar'}
					</button>
					<button
						type="button"
						disabled={props.pending === 'discard'}
						onClick={props.onCancel}
						class={profileCancelDiscardButtonClass}
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
}
