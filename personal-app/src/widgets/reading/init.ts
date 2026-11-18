import { syncInitialRailWords } from './annotations';
import { initDecks } from './decks';
import { initKeyboard } from './input';
import { initReading } from './loadReading';
import { initMarkActions } from './markActions';
import { initReaderPrefs } from './prefs';
import { initScrollInput } from './scroll';
import { initSelection } from './selection';
import { initSaveButton } from './status';
import { initTimer } from './timer';
import { initZen } from './zen';

// Entry point of the reading page. Everything reads its state from the
// `data-*` attributes the page renders on `<body>`, so the init order is the
// only contract: preferences first, then the reading load, then the chrome.

export function initReader(): void {
	initReaderPrefs();
	initScrollInput();
	syncInitialRailWords();
	initReading();
	initDecks();
	initTimer();
	initZen();
	initKeyboard();
	initSaveButton();
	initSelection();
	initMarkActions();
}
