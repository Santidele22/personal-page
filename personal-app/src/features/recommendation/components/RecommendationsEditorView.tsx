import { AdminCreateSection } from '../../../shared/ui/admin/AdminCreateSection';
import { AdminFeedbackBanner } from '../../../shared/ui/admin/AdminFeedbackBanner';
import { AdminListSection } from '../../../shared/ui/admin/AdminListSection';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import type { AdminRecommendationRow } from '../api/recommendations-admin';
import type { RecommendationFormState } from '../recommendationForm';
import { RecommendationFields } from './RecommendationFields';
import { RecommendationRowCard } from './RecommendationRowCard';

export type RecommendationsEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	rows: readonly AdminRecommendationRow[];
	pending: boolean;
	newForm: RecommendationFormState;
	draftForm: RecommendationFormState;
	editingId: number | null;
	confirmingDeleteId: number | null;
	onRetry: () => void;
	onCreateSubmit: (event: SubmitEvent) => void;
	onNewInput: <K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) => void;
	onDraftInput: <K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) => void;
	onStartEdit: (row: AdminRecommendationRow) => void;
	onCancelEdit: () => void;
	onSubmitEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (id: number) => void;
	onConfirmDelete: (id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the recommendations admin CRUD panel. */
export function RecommendationsEditorView(props: RecommendationsEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando las recomendaciones…"
				errorText="No pudimos cargar las recomendaciones. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<AdminFeedbackBanner feedback={props.feedback} />

				<AdminCreateSection
					headingId="recomendaciones-nueva"
					heading="NUEVA RECOMENDACIÓN"
					submitLabel="Añadir recomendación"
					pending={props.pending}
					onSubmit={props.onCreateSubmit}
				>
					<RecommendationFields
						form={props.newForm}
						prefix="recommendation-new"
						disabled={props.pending}
						onInput={props.onNewInput}
					/>
				</AdminCreateSection>

				<AdminListSection
					headingId="recomendaciones-lista"
					heading="RECOMENDACIONES GUARDADAS"
					rows={props.rows}
					singularLabel="recomendación"
					pluralLabel="recomendaciones"
					orderNote="en orden de posición"
					emptyText="Todavía no hay recomendaciones guardadas: la web muestra el estado vacío de la sección. Añade la primera en el formulario de arriba."
				>
					{(row) => (
						<RecommendationRowCard
							row={row}
							editing={props.editingId === row.id}
							confirmingDelete={props.confirmingDeleteId === row.id}
							pending={props.pending}
							draftForm={props.draftForm}
							onDraftInput={props.onDraftInput}
							onStartEdit={() => props.onStartEdit(row)}
							onCancelEdit={props.onCancelEdit}
							onSubmitEdit={(event) => props.onSubmitEdit(event, row.id)}
							onRequestDelete={() => props.onRequestDelete(row.id)}
							onConfirmDelete={() => props.onConfirmDelete(row.id)}
							onCancelDelete={props.onCancelDelete}
						/>
					)}
				</AdminListSection>
			</AdminStatusGate>
		</div>
	);
}
