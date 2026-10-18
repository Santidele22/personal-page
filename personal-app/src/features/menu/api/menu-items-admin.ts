import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/http';

/**
 * Admin CRUD for the `menu-items` domain (`/admin/menu/`), separate from the
 * landing loader (`./menu-links.ts`) because the two have opposite error
 * policies: the header softens a failure into its fallback, while the panel must
 * show the real answer the backend gave (`400 { message }` on validation,
 * `401`/`403` on the guards). These calls run in the browser island, so they keep
 * the relative `/api` base and need no `serverOrigin`.
 */

/**
 * A row as `GET /menu-items` serves it. The list already arrives ordered by
 * `position` (ties by id), so the panel renders the stored order as-is.
 */
export type MenuItemRow = {
	id: number;
	label: string;
	href: string;
	position: number;
};

/**
 * Body of `POST /menu-items`; `PATCH /menu-items/:id` accepts any subset. An
 * omitted `position` means "append after the last stored item" on create and
 * "leave it where it is" on update.
 */
export type MenuItemInput = {
	label: string;
	href: string;
	position?: number;
};

export function fetchMenuItemRows(): Promise<MenuItemRow[]> {
	return getJson<MenuItemRow[]>('/menu-items');
}

export function createMenuItem(body: MenuItemInput): Promise<void> {
	return postJson('/menu-items', body);
}

export function updateMenuItem(id: number, body: Partial<MenuItemInput>): Promise<void> {
	return patchJson(`/menu-items/${id}`, body);
}

export function deleteMenuItem(id: number): Promise<void> {
	return deleteJson(`/menu-items/${id}`);
}
