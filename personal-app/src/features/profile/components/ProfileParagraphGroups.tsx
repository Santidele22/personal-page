import { Index, Show } from 'solid-js';
import { adminCardClass, adminHintClass, adminSectionHeadingClass } from '../../../shared/ui/admin/styles';
import type { ProfileCommitment } from '../types';
import type { ProfileValueForm } from '../profileForm';
import {
	ProfileField,
	profileAddButtonClass,
	profileRemoveButtonClass,
} from './ProfileFields';

/**
 * The two list-shaped sections of the profile form: VALORES (one
 * `title`/`description` pair per stored line) and COMPROMISOS (the hero data
 * row). The panel owns the rows; these sections only render and report input.
 */

export type ProfileValuesSectionProps = {
	values: readonly ProfileValueForm[];
	onInput: (index: number, field: keyof ProfileValueForm, value: string) => void;
	onAdd: () => void;
	onRemove: (index: number) => void;
};

/** VALORES: each value with its own explanation. */
export function ProfileValuesSection(props: ProfileValuesSectionProps) {
	return (
		<section aria-labelledby="perfil-valores" class={adminCardClass}>
			<div class="flex items-center justify-between gap-4">
				<h2 id="perfil-valores" class={adminSectionHeadingClass}>
					VALORES
				</h2>
				<button type="button" onClick={props.onAdd} class={profileAddButtonClass}>
					+ Añadir
				</button>
			</div>
			<p class={adminHintClass}>Cada valor con su descripción; se muestra en la web tal como se guarda.</p>
			<Show
				when={props.values.length > 0}
				fallback={<p class="mt-5 text-sm text-muted-foreground">Sin valores: la web no muestra la lista.</p>}
			>
				<ul class="mt-4 flex flex-col gap-3">
					<Index each={props.values}>
						{(value, index) => (
							<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
								<ProfileField
									id={`profile-value-title-${index}`}
									label="VALOR"
									value={value().title}
									onInput={(input) => props.onInput(index, 'title', input)}
								/>
								<ProfileField
									id={`profile-value-description-${index}`}
									label="EXPLICACIÓN"
									value={value().description}
									onInput={(input) => props.onInput(index, 'description', input)}
								/>
								<button
									type="button"
									onClick={() => props.onRemove(index)}
									class={profileRemoveButtonClass}
								>
									Quitar
								</button>
							</li>
						)}
					</Index>
				</ul>
			</Show>
		</section>
	);
}

export type ProfileCommitmentsSectionProps = {
	commitments: readonly ProfileCommitment[];
	onInput: (index: number, field: keyof ProfileCommitment, value: string) => void;
	onAdd: () => void;
	onRemove: (index: number) => void;
};

/** COMPROMISOS: the hero figure and what it means. */
export function ProfileCommitmentsSection(props: ProfileCommitmentsSectionProps) {
	return (
		<section aria-labelledby="perfil-compromisos" class={adminCardClass}>
			<div class="flex items-center justify-between gap-4">
				<h2 id="perfil-compromisos" class={adminSectionHeadingClass}>
					COMPROMISOS
				</h2>
				<button type="button" onClick={props.onAdd} class={profileAddButtonClass}>
					+ Añadir
				</button>
			</div>
			<p class={adminHintClass}>Los tres datos del hero: la cifra o el nombre, y qué significa.</p>
			<Show
				when={props.commitments.length > 0}
				fallback={
					<p class="mt-5 text-sm text-muted-foreground">
						Sin compromisos: el hero no muestra la fila de datos.
					</p>
				}
			>
				<ul class="mt-4 flex flex-col gap-3">
					<Index each={props.commitments}>
						{(commitment, index) => (
							<li class="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
								<ProfileField
									id={`profile-commitment-value-${index}`}
									label="DATO"
									value={commitment().value}
									onInput={(value) => props.onInput(index, 'value', value)}
								/>
								<ProfileField
									id={`profile-commitment-label-${index}`}
									label="DESCRIPCIÓN"
									value={commitment().label}
									onInput={(value) => props.onInput(index, 'label', value)}
								/>
								<button
									type="button"
									onClick={() => props.onRemove(index)}
									class={profileRemoveButtonClass}
								>
									Quitar
								</button>
							</li>
						)}
					</Index>
				</ul>
			</Show>
		</section>
	);
}
