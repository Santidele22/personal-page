export type ServiceIcon = 'pen-line' | 'handshake' | 'graduation-cap';

export type Service = {
	num: string;
	icon: ServiceIcon;
	title: string;
	description: string;
	items: string[];
	price: string;
};
