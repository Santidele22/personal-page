export type PostIcon = 'compass' | 'database' | 'blocks' | 'wrench' | 'scale';

export type Post = {
	slug: string;
	title: string;
	excerpt: string;
	category: string;
	icon: PostIcon;
	date: string;
	readMin: number;
	featured?: boolean;
};
