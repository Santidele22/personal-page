import { Show } from 'solid-js';
import { adminHintClass, adminInputClass, adminLabelClass } from './styles';

export type AdminFieldProps = {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	type?: 'text' | 'number' | 'date' | 'url';
	min?: number;
	step?: number;
	multiline?: boolean;
	rows?: number;
	disabled?: boolean;
	onInput: (value: string) => void;
};

/** Labelled text, number, date, or multiline input shared across admin forms. */
export function AdminField(props: AdminFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<Show
				when={props.multiline}
				fallback={
					<input
						id={props.id}
						type={props.type ?? 'text'}
						min={props.type === 'number' ? (props.min ?? 0) : undefined}
						step={props.type === 'number' ? (props.step ?? 1) : undefined}
						value={props.value}
						placeholder={props.placeholder}
						disabled={props.disabled}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${adminInputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
					value={props.value}
					placeholder={props.placeholder}
					disabled={props.disabled}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${adminInputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			<Show when={props.hint}>
				{(hint) => <p class={adminHintClass}>{hint()}</p>}
			</Show>
		</div>
	);
}
