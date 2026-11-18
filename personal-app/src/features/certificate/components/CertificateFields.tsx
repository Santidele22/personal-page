import { AdminField } from '../../../shared/ui/admin/AdminField';
import type { CertificateFormState } from '../certificateForm';

export type CertificateFieldsProps = {
	form: CertificateFormState;
	prefix: string;
	disabled?: boolean;
	onInput: <K extends keyof CertificateFormState>(key: K, value: CertificateFormState[K]) => void;
};

/** Shared field grid for creating and inline-editing a certificate. */
export function CertificateFields(props: CertificateFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<AdminField
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Meta Front-End Developer"
				disabled={props.disabled}
				onInput={(value) => props.onInput('title', value)}
			/>
			<AdminField
				id={`${props.prefix}-date`}
				label="FECHA"
				type="date"
				value={props.form.date}
				hint="La web ordena los certificados por esta fecha, del más reciente al más antiguo."
				disabled={props.disabled}
				onInput={(value) => props.onInput('date', value)}
			/>
			<AdminField
				id={`${props.prefix}-description`}
				label="DESCRIPCIÓN"
				value={props.form.description}
				multiline
				rows={3}
				disabled={props.disabled}
				onInput={(value) => props.onInput('description', value)}
			/>
			<AdminField
				id={`${props.prefix}-issuer`}
				label="LINK DEL LUGAR"
				value={props.form.issuerLink}
				placeholder="https://coursera.org"
				hint="La plataforma o institución que lo emitió. Si queda vacío, la tarjeta se muestra sin enlace."
				disabled={props.disabled}
				onInput={(value) => props.onInput('issuerLink', value)}
			/>
		</div>
	);
}
