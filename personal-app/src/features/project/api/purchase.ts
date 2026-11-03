import { CONTACT_EMAIL } from '../../../app/config/site';

export type PurchaseContact = {
	name: string;
	email: string;
	message: string;
};

export function projectPurchaseMailto(projectName: string, contact: PurchaseContact): string {
	const subject = encodeURIComponent(`Consulta de compra: ${projectName}`);
	const body = encodeURIComponent(
		`Proyecto: ${projectName}\nNombre: ${contact.name}\nEmail: ${contact.email}\n\n${contact.message}`,
	);

	return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
