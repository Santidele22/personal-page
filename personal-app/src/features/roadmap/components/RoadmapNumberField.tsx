import { adminHintClass, adminInputClass, adminLabelClass } from '../../../shared/ui/admin/styles';

export type RoadmapNumberFieldProps = {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	onInput: (value: string) => void;
};

/**
 * Number input of the roadmap forms. The shared `AdminField` has no `max`, and
 * both numeric columns of this panel keep the `min="0" max="100" step="1"`
 * constraint they shipped with (the browser refuses a `101%` submit before the
 * Spanish validation sees it), so this control stays local instead of loosening
 * the shell.
 */
export function RoadmapNumberField(props: RoadmapNumberFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type="number"
				min={0}
				max={100}
				step={1}
				value={props.value}
				placeholder={props.placeholder}
				onInput={(event) => props.onInput(event.currentTarget.value)}
				class={`${adminInputClass} mt-2`}
			/>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}
