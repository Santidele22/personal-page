import { describe, expect, it } from 'vitest';
import {
	ADMIN_HOME,
	adminRedirectTarget,
	isAdminSecurityScope,
	isProtectedAdminRoute,
	isReaderRoute,
} from './paths';

describe('isReaderRoute', () => {
	it.each([
		['/lecturas/1', true],
		['/lecturas/42/', true],
		['/lecturas/abc', true],
		['/lecturas', false],
		['/lecturas/', false],
		['/lecturas/1/extra', false],
		['/admin/libros', false],
	])('%s → reader=%j', (pathname, expected) => {
		expect(isReaderRoute(pathname)).toBe(expected);
	});
});

describe('isProtectedAdminRoute and isAdminSecurityScope', () => {
	it.each([
		['/admin', true, true],
		['/admin/', true, true],
		['/admin/libros', true, true],
		['/admin/login', false, true],
		['/admin/login/', false, true],
		['/admin/recuperar', false, true],
		['/lecturas/7', true, true],
		['/lecturas/7/', true, true],
		['/lecturas', false, false],
		['/lecturas/', false, false],
		['/', false, false],
	])('%s → protected=%j, adminCsp=%j', (pathname, expectedProtected, expectedCsp) => {
		expect(isProtectedAdminRoute(pathname)).toBe(expectedProtected);
		expect(isAdminSecurityScope(pathname)).toBe(expectedCsp);
	});
});

describe('adminRedirectTarget', () => {
	it('allows panel routes and admin-only reader routes, blocking open redirects', () => {
		expect(adminRedirectTarget('/admin/libros')).toBe('/admin/libros');
		expect(adminRedirectTarget('/lecturas/7')).toBe('/lecturas/7');
		expect(adminRedirectTarget('/lecturas/7?foo=1')).toBe('/lecturas/7?foo=1');
		expect(adminRedirectTarget('/lecturas/')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget('//evil.com')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget('https://evil.com/lecturas/7')).toBe(ADMIN_HOME);
		expect(adminRedirectTarget(null)).toBe(ADMIN_HOME);
	});
});
