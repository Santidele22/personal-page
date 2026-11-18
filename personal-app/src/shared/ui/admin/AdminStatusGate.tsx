import { Match, Switch } from 'solid-js';
import type { JSX } from 'solid-js';
import type { AdminPanelStatus } from '../../lib/adminPanel';
import { adminRowButtonClass } from './styles';

export type AdminStatusGateProps = {
	status: AdminPanelStatus;
	loadingText: string;
	errorText: string;
	onRetry: () => void;
	children: JSX.Element;
};

/** Handles the initial loading, fetch-error retry, and ready views for an admin panel. */
export function AdminStatusGate(props: AdminStatusGateProps) {
	return (
		<Switch>
			<Match when={props.status === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					{props.loadingText}
				</p>
			</Match>
			<Match when={props.status === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">{props.errorText}</p>
					<button type="button" onClick={props.onRetry} class={`${adminRowButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Match>
			<Match when={props.status === 'ready'}>{props.children}</Match>
		</Switch>
	);
}
