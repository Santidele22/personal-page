import type { BookDisplayItem, ChapterNavItem } from '../../features/book/lib/reader';

// The document currently mounted in the reader: display items, detected
// chapters and the item the viewport is on. Several widgets read and write
// these, so they live behind accessors instead of being duplicated.

export const BATCH_SIZE = 50;

let displayItems: BookDisplayItem[] = [];
let chapters: ChapterNavItem[] = [];
let currentItemIndex = 0;
let totalParas = 0;

export function getDisplayItems(): BookDisplayItem[] {
	return displayItems;
}

export function setDisplayItems(next: BookDisplayItem[]): void {
	displayItems = next;
}

export function getChapters(): ChapterNavItem[] {
	return chapters;
}

export function setChapters(next: ChapterNavItem[]): void {
	chapters = next;
}

export function getCurrentItemIndex(): number {
	return currentItemIndex;
}

export function setCurrentItemIndex(next: number): void {
	currentItemIndex = next;
}

export function getTotalParas(): number {
	return totalParas;
}

export function setTotalParas(next: number): void {
	totalParas = next;
}
