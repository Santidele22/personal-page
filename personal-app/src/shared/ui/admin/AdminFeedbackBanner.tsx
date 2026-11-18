import { Match, Switch } from 'solid-js';
import type { AdminPanelFeedback } from '../../lib/adminPanel';

export type AdminFeedbackBannerProps = {
	feedback: AdminPanelFeedback;
};

/** Renders the result of the latest admin mutation as a live status or alert strip. */
export function AdminFeedbackBanner(props: AdminFeedbackBannerProps) {
	return (
		<Switch>
			<Match when={props.feedback.kind === 'success' ? props.feedback : null}>
				{(item) => (
					<p role="status" class="flex items-center gap-2 border border-border bg-card px-5 py-3 text-sm text-foreground">
						<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
						{item().message}
					</p>
				)}
			</Match>
			<Match when={props.feedback.kind === 'error' ? props.feedback : null}>
				{(item) => (
					<p role="alert" class="border border-destructive/40 bg-destructive/10 px-5 py-3 text-sm text-destructive">
						{item().message}
					</p>
				)}
			</Match>
		</Switch>
	);
}
