import type { Certificate } from "../../../entities/certificate/types";
import { certificates } from "../../../entities/certificate/data";
import { getJson } from "../../../shared/api/http";
import { safeHref } from "../../../shared/api/url";

/**
 * Same one-line base expression the admin api files use: the configured base
 * is relative (proxied `/api`) or an absolute origin for a remote backend.
 */
const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

/**
 * A certificate row as the public `GET /certificates` serves it: the editable
 * columns, with `createdAt`/`updatedAt` stripped and the image optional (the
 * column is nullable, so it arrives as `null` or missing).
 */
type ApiCertificate = {
  id: number;
  image?: string | null;
  title: string;
  description: string;
  issuerLink?: string | null;
  date: string;
};

/**
 * An image is only rendered when the browser can load it on its own: an
 * absolute http(s) URL, a root-relative path the site serves, or an uploaded
 * image (`uploads/…`) served by the backend's anonymous
 * `GET /certificates/:id/image` delivery route. An empty value, a bare scheme
 * (`javascript:…`) or a `//host/…` scheme-relative form yields `undefined`, so
 * the card drops the image block instead of showing a broken placeholder (S6).
 */
const HTTP_IMAGE = /^https?:\/\/\S+$/i;
const ROOT_RELATIVE_IMAGE = /^\/(?!\/)\S+$/;
const UPLOADS_PATH_IMAGE = /^uploads\//;

export function certificateImage(
  image: string | null | undefined,
  id?: number,
): string | undefined {
  const value = image?.trim();

  if (!value) {
    return undefined;
  }

  if (HTTP_IMAGE.test(value) || ROOT_RELATIVE_IMAGE.test(value)) {
    return value;
  }

  // An uploaded image is not directly loadable from the browser: it loads
  // through the backend's anonymous delivery route, honoring the configured
  // base (relative `/api` proxied, or absolute PUBLIC_API_BASE_URL).
  if (id !== undefined && UPLOADS_PATH_IMAGE.test(value)) {
    return `${apiBase}/certificates/${id}/image`;
  }

  return undefined;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * The date line of a card: the stored `YYYY-MM-DD` becomes «marzo de 2024».
 * Anything that is not a real calendar shape (a timestamp with an unexpected
 * offset, a corrupted value) renders as it arrives instead of an invented
 * date.
 */
export function formatCertificateDate(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})/.exec(raw);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;

  return match && month ? `${month} de ${match[1]}` : raw;
}

/**
 * The landing section (`widgets/certificates/Certificates.astro`). `null` only
 * means the request itself failed (API down, proxy misconfigured, server
 * without the backend): the widget then renders the sample it shipped with. An
 * empty stored collection answers `[]` (nothing to render) and the widget
 * shows its empty state instead of pinning the old copy. Rows keep the API
 * order, which is already newest first (S3).
 */
export async function fetchCertificates(
  serverOrigin?: string,
): Promise<Certificate[] | null> {
  try {
    const rows = await getJson<ApiCertificate[]>("/certificates", {
      serverOrigin,
    });

    return rows.map((row) => ({
      id: row.id,
      image: certificateImage(row.image, row.id),
      title: row.title,
      description: row.description,
      // http/https/mailto only (shared/api/url.ts), so a stored `javascript:`
      // value can never reach an `href`; `''` means "sin link" and the card
      // renders the issuer as plain text.
      issuerLink: safeHref(row.issuerLink) ?? "",
      date: row.date,
    }));
  } catch {
    return null;
  }
}

export { certificates as certificatesFallback };
