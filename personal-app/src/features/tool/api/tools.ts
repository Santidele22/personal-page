import type { Tool } from '../../../entities/tool/types';
import { tools } from '../../../entities/tool/data';
import { getJson } from '../../../shared/api/http';

/**
 * A tool row as `GET /tools` serves it.
 */
type ApiTool = {
	id: number;
	name: string;
	what: string;
};

/**
 * The "herramientas que uso" grid (`widgets/blog/ToolsBlock.astro`). `null`
 * means the request itself failed (API down, proxy misconfigured, server
 * without the backend): the widget then renders the values the grid shipped
 * with, exactly like the profile loader. An empty stored collection answers
 * `[]` (nothing to render): the admin chose to hide the block, not to fall
 * back — the widget hides the list instead of pinning the old copy.
 */
export async function fetchTools(serverOrigin?: string): Promise<Tool[] | null> {
	try {
		const rows = await getJson<ApiTool[]>('/tools', { serverOrigin });

		return rows.map((tool) => ({ name: tool.name, what: tool.what }));
	} catch {
		return null;
	}
}

export { tools as toolsFallback };
