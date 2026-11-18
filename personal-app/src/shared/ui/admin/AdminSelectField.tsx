import { For, Show } from 'solid-js';
import { adminHintClass, adminInputClass, adminLabelClass } from './styles';

export type AdminSelectOption = {
	value: string;
	label: string;
};

export type AdminSelectFieldProps = {
	id: string;
	label: string;
	value: string;
	options: readonly AdminSelectOption[];
	hint?: string;
	disabled?: boolean;
	onInput: (value: string) => void;
};

/** Labelled select field shared across admin forms. */
export function AdminSelectField(props: AdminSelectFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<select
				id={props.id}
				value={props.value}
				disabled={props.disabled}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${adminInputClass} mt-2`}
			>
				<For each={props.options}>
					{(option) => (
						<option value={option.value} selected={option.value === props.value}>
							{option.label}
						</option>
					)}
				</For>
			</select>
			<Show when={props.hint}>
				{(hint) => <p class={adminHintClass}>{hint()}</p>}
			</Show>
		</div>
	);
}
