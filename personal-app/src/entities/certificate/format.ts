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
 * The date line of a certificate card: the stored `YYYY-MM-DD` becomes
 * «marzo de 2024». Anything that is not a real calendar shape (a timestamp
 * with an unexpected offset, a corrupted value) renders as it arrives instead
 * of an invented date.
 */
export function formatCertificateDate(value: string | null | undefined): string {
	const raw = value?.trim() ?? "";
	const match = /^(\d{4})-(\d{2})/.exec(raw);
	const month = match ? MONTHS[Number(match[2]) - 1] : undefined;

	return match && month ? `${month} de ${match[1]}` : raw;
}
