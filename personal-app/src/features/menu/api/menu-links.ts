import type { NavLink } from '../../../app/config/site';
import { NAV_LINKS } from '../../../app/config/site';
import { getJson } from '../../../shared/api/http';

/**
 * A menu item row as `GET /menu-items` serves it, already ordered by the
 * backend (`position`, ties by id).
 */
type ApiMenuItem = {
	id: number;
	label: string;
	href: string;
	position: number;
};

/**
 * The site menu (`widgets/site-header/SiteHeader.astro` and its mobile
 * navigation). `null` only means the request itself failed (API down, proxy
 * misconfigured, server without the backend): the header then renders the
 * links the site shipped with, exactly like the profile loader. An empty
 * stored collection answers `[]`: the admin chose an empty menu, so the header
 * renders without links instead of pinning the old copy.
 */
export async function fetchMenuLinks(serverOrigin?: string): Promise<NavLink[] | null> {
	try {
		const rows = await getJson<ApiMenuItem[]>('/menu-items', { serverOrigin });

		return rows.map((item) => ({ href: item.href, label: item.label }));
	} catch {
		return null;
	}
}

export { NAV_LINKS as navLinksFallback };
