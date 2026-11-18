import type { ProfileFormState } from '../profileForm';
import { ProfileField, ProfileSection } from './ProfileFields';

/**
 * The single-field sections of the profile form: identity, hero, about, site
 * meta, social links and the contact/footer copy. Purely presentational; the
 * panel owns the values.
 */

export type ProfileSectionsProps = {
	form: ProfileFormState;
	onInput: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
};

/** IDENTIDAD: name and role. */
export function ProfileIdentitySection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-identidad" heading="IDENTIDAD" twoColumns>
			<ProfileField
				id="profile-name"
				label="NOMBRE"
				value={props.form.name}
				onInput={(value) => props.onInput('name', value)}
			/>
			<ProfileField
				id="profile-role"
				label="ROL"
				value={props.form.role}
				onInput={(value) => props.onInput('role', value)}
			/>
		</ProfileSection>
	);
}

/** HERO: eyebrow, title and intro. */
export function ProfileHeroSection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-hero" heading="HERO">
			<ProfileField
				id="profile-eyebrow"
				label="ANTETÍTULO"
				value={props.form.eyebrow}
				hint="La línea en versalitas encima del título."
				onInput={(value) => props.onInput('eyebrow', value)}
			/>
			<ProfileField
				id="profile-hero-title"
				label="TÍTULO"
				value={props.form.heroTitle}
				hint="Incluye el punto final: la web lo pinta en color de acento."
				onInput={(value) => props.onInput('heroTitle', value)}
			/>
			<ProfileField
				id="profile-hero-intro"
				label="INTRODUCCIÓN"
				value={props.form.heroIntro}
				multiline
				rows={4}
				onInput={(value) => props.onInput('heroIntro', value)}
			/>
		</ProfileSection>
	);
}

/** SOBRE MÍ: the bio, one paragraph per line. */
export function ProfileAboutSection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-sobre-mi" heading="SOBRE MÍ">
			<ProfileField
				id="profile-bio"
				label="BIO"
				value={props.form.bioParagraphs}
				multiline
				rows={6}
				hint="Un párrafo por línea; las líneas vacías se descartan."
				onInput={(value) => props.onInput('bioParagraphs', value)}
			/>
		</ProfileSection>
	);
}

/** META DEL SITIO: the document title, description and author columns. */
export function ProfileSiteMetaSection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-meta" heading="META DEL SITIO" twoColumns>
			<ProfileField
				id="profile-site-name"
				label="NOMBRE"
				value={props.form.siteName}
				onInput={(value) => props.onInput('siteName', value)}
			/>
			<ProfileField
				id="profile-site-author"
				label="AUTOR"
				value={props.form.siteAuthor}
				onInput={(value) => props.onInput('siteAuthor', value)}
			/>
			<div class="sm:col-span-2">
				<ProfileField
					id="profile-site-title"
					label="TÍTULO DE PESTAÑA"
					value={props.form.siteTitle}
					onInput={(value) => props.onInput('siteTitle', value)}
				/>
			</div>
			<div class="sm:col-span-2">
				<ProfileField
					id="profile-site-description"
					label="DESCRIPCIÓN"
					value={props.form.siteDescription}
					multiline
					rows={3}
					hint="Se usa en el meta description y en Open Graph."
					onInput={(value) => props.onInput('siteDescription', value)}
				/>
			</div>
		</ProfileSection>
	);
}

/** REDES: the two social links. */
export function ProfileNetworksSection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-redes" heading="REDES" twoColumns>
			<ProfileField
				id="profile-github"
				label="GITHUB"
				value={props.form.githubUrl}
				onInput={(value) => props.onInput('githubUrl', value)}
			/>
			<ProfileField
				id="profile-linkedin"
				label="LINKEDIN"
				value={props.form.linkedinUrl}
				onInput={(value) => props.onInput('linkedinUrl', value)}
			/>
		</ProfileSection>
	);
}

/** CONTACTO Y PIE: contact intro, footer blurb and copyright. */
export function ProfileContactFooterSection(props: ProfileSectionsProps) {
	return (
		<ProfileSection id="perfil-pie" heading="CONTACTO Y PIE">
			<ProfileField
				id="profile-contact-intro"
				label="INTRO DE CONTACTO"
				value={props.form.contactIntro}
				multiline
				rows={4}
				onInput={(value) => props.onInput('contactIntro', value)}
			/>
			<ProfileField
				id="profile-footer-blurb"
				label="TEXTO DEL PIE"
				value={props.form.footerBlurb}
				multiline
				rows={3}
				onInput={(value) => props.onInput('footerBlurb', value)}
			/>
			<ProfileField
				id="profile-footer-copyright"
				label="COPYRIGHT"
				value={props.form.footerCopyright}
				hint="Se muestra tal cual, con el año incluido."
				onInput={(value) => props.onInput('footerCopyright', value)}
			/>
		</ProfileSection>
	);
}
