import type { Tool, ToolSponsorship } from "../../../entities/tool/types";
import { tools } from "../../../entities/tool/data";
import { getJson } from "../../../shared/api/http";
import { safeHref } from "../../../shared/api/url";

/**
 * A tool row as `GET /tools` serves it. `sponsorship` always arrives once the
 * backend grew the field (the entity column defaults it); an older backend
 * without it is mapped to the default classification.
 */
type ApiTool = {
  id: number;
  name: string;
  what: string;
  sponsorship?: ToolSponsorship;
  url?: string | null;
};

/**
 * The "herramientas que uso" grid (`widgets/blog/ToolsBlock.astro`). `null`
 * means the request itself failed (API down, proxy misconfigured, server
 * without the backend): the widget then renders the values the grid shipped
 * with, exactly like the profile loader. An empty stored collection answers
 * `[]` (nothing to render): the admin chose to hide the block, not to fall
 * back — the widget hides the list instead of pinning the old copy.
 */
export async function fetchTools(
  serverOrigin?: string,
): Promise<Tool[] | null> {
  try {
    const rows = await getJson<ApiTool[]>("/tools", { serverOrigin });

    return rows.map((tool) => ({
      name: tool.name,
      what: tool.what,
      sponsorship: tool.sponsorship ?? "genuina",

      // http/https/mailto schemes only (issue 38): a managed URL with any
      // other scheme drops to the widget fallback (`/marcas`) instead of
      // being rendered.
      url: safeHref(tool.url),
    }));
  } catch {
    return null;
  }
}

export { tools as toolsFallback };
