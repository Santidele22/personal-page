import { Show } from 'solid-js';
import { adminHintClass, adminLabelClass } from '../../../shared/ui/admin/styles';
import { CERTIFICATE_IMAGE_ACCEPT } from '../certificateForm';

export type CertificateFileFieldProps = {
	id: string;
	label: string;
	hint?: string;
	disabled?: boolean;
	onSelect: (file: File | null) => void;
};

/** Presentational optional image picker; hands the container a `File` or `null`. */
export function CertificateFileField(props: CertificateFileFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type="file"
				accept={CERTIFICATE_IMAGE_ACCEPT}
				disabled={props.disabled}
				onChange={(event) => props.onSelect(event.currentTarget.files?.[0] ?? null)}
				class="mt-2 block max-w-full text-[12px] text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:border-aka hover:file:text-aka disabled:cursor-not-allowed disabled:opacity-60"
			/>
			<Show when={props.hint}>
				{(hint) => <p class={adminHintClass}>{hint()}</p>}
			</Show>
		</div>
	);
}
