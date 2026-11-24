import { describe, expect, it } from 'vitest';
import {
	ADMIN_HOME,
	adminRedirectTarget,
	isAdminSecurityScope,
	isProtectedAdminRoute,
} from './paths';

describe('isProtectedAdminRoute and isAdminSecurityScope', () => {
	it.each([
		['/admin', true, true],
		['/admin/', true, true],
		['/admin/proyectos', true, true],
		['/admin/login', false, true],
		['/admin/login/', false, true],
		['/admin/recuperar', false, true],
		['/lecturas/7', false, false],
		['/', false, false],
	])('%s → protected=%j, adminCsp=%j', (pathname, expectedProtected, expectedCsp) => {
		expect(isProtectedAdminRoute(pathname)).toBe(expectedProtected);
		expect(isAdminSecurityScope(pathname)).toBe(expectedCsp);
	});
});

describe('adminRedirectTarget', () => {
	it('allows panel routes while rejecting external and non-admin targets', () => {
		expect(adminRedirectTarget('/admin/proyectos')).toBe('/admin/proyectos');
		expect(adminRedirectTarget('/admin/proyectos?tab=1')).toBe('/admin/proyectos?tab=1');
		expect(adminRedirectTarget('/lecturas/7')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget('//evil.com')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget('https://evil.com/admin')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget(null)).toBe(ADMIN_HOME);
	});
});
