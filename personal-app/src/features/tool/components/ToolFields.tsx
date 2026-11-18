import { AdminField } from '../../../shared/ui/admin/AdminField';
import { AdminSelectField } from '../../../shared/ui/admin/AdminSelectField';
import { TOOL_SPONSORSHIP_OPTIONS } from '../toolForm';
import type { ToolFormState } from '../toolForm';

export type ToolFieldsProps = {
	form: ToolFormState;
	prefix: string;
	disabled?: boolean;
	/**
	 * The create form keeps the placeholder copy and the sponsorship hint of the
	 * panel; the inline row editor stays clean so its output does not change.
	 */
	withHints?: boolean;
	onInput: <K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) => void;
};

/** Shared field grid for creating and inline-editing a tool. */
export function ToolFields(props: ToolFieldsProps) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<AdminField
				id={`${props.prefix}-name`}
				label="NOMBRE"
				value={props.form.name}
				placeholder={props.withHints ? 'Astro' : undefined}
				disabled={props.disabled}
				onInput={(value) => props.onInput('name', value)}
			/>
			<AdminField
				id={`${props.prefix}-what`}
				label="PARA QUÉ SIRVE"
				value={props.form.what}
				placeholder={props.withHints ? 'El sitio entero, del markdown al HTML' : undefined}
				disabled={props.disabled}
				onInput={(value) => props.onInput('what', value)}
			/>
			<AdminField
				id={`${props.prefix}-url`}
				label="LINK"
				value={props.form.url}
				placeholder={props.withHints ? 'https://astro.build' : undefined}
				disabled={props.disabled}
				onInput={(value) => props.onInput('url', value)}
			/>
			<AdminSelectField
				id={`${props.prefix}-sponsorship`}
				label="PATROCINIO"
				value={props.form.sponsorship}
				options={TOOL_SPONSORSHIP_OPTIONS}
				hint={
					props.withHints
						? 'Una herramienta patrocinada se muestra aparte y marcada en la landing.'
						: undefined
				}
				disabled={props.disabled}
				onInput={(value) => props.onInput('sponsorship', value as ToolFormState['sponsorship'])}
			/>
		</div>
	);
}
