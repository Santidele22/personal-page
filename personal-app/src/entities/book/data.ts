import type { Book } from './types';

/* The shelf the reading section shipped with before the books entity was
   consumed by the landing: an empty list, because the backend is the only
   source of truth and the section renders its empty state until the admin
   publishes a book. */
export const books: Book[] = [];

export { books as booksFallback };
