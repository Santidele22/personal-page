// Cached DOM handles of the reading page.
//
// The page `<script>` is deferred, so every node already exists when this
// module evaluates.

export const body = document.body;
export const stage = document.getElementById('stage') as HTMLElement | null;
export const readerArticle = document.getElementById('readerArticle');

export const toast = document.getElementById('toast');
export const progPage = document.getElementById('progPage');
export const progTotalPages = document.getElementById('progTotalPages');
export const progPct = document.getElementById('progPct');
export const progSummary = document.getElementById('progSummary');

export const fontPctEl = document.getElementById('fontPct');

export const prevChapterBtn = document.getElementById('prevChapterBtn') as HTMLButtonElement | null;
export const nextChapterBtn = document.getElementById('nextChapterBtn') as HTMLButtonElement | null;
export const chapterBtn = document.getElementById('chapterBtn') as HTMLButtonElement | null;
export const chapterBtnLabel = document.getElementById('chapterBtnLabel');
export const chapterDeck = document.getElementById('chapterDeck');
export const chapterList = document.getElementById('chapterList');

export const viewDeck = document.getElementById('viewDeck');
export const viewBtn = document.getElementById('viewBtn');
export const fullBtn = document.getElementById('fullBtn');
export const fullLabel = document.getElementById('fullLabel');

export const timerDeck = document.getElementById('timerDeck');
export const timerBtn = document.getElementById('timerBtn') as HTMLButtonElement | null;
export const timerBtnLabel = document.getElementById('timerBtnLabel');
export const timerBtnDot = document.getElementById('timerBtnDot');
export const topTimerPill = document.getElementById('topTimerPill');
export const topTimerClock = document.getElementById('topTimerClock');
export const topBackLink = document.getElementById('topBackLink') as HTMLAnchorElement | null;
export const bottomBackLink = document.getElementById('bottomBackLink') as HTMLAnchorElement | null;
export const timerSetupView = document.getElementById('timerSetupView');
export const timerRunningView = document.getElementById('timerRunningView');
export const timerCustomMinutes = document.getElementById('timerCustomMinutes') as HTMLInputElement | null;
export const timerStartBtn = document.getElementById('timerStartBtn') as HTMLButtonElement | null;
export const timerStatsNote = document.getElementById('timerStatsNote');
export const timerStatusBadge = document.getElementById('timerStatusBadge');
export const timerClockDisplay = document.getElementById('timerClockDisplay');
export const timerBarFill = document.getElementById('timerBarFill') as HTMLElement | null;
export const timerPauseNote = document.getElementById('timerPauseNote');
export const timerChimeToggle = document.getElementById('timerChimeToggle') as HTMLButtonElement | null;

export const vigiliaLockVeil = document.getElementById('vigiliaLockVeil');
export const vigiliaVeilClock = document.getElementById('vigiliaVeilClock');
export const vigiliaVeilReason = document.getElementById('vigiliaVeilReason');
export const vigiliaResumeBtn = document.getElementById('vigiliaResumeBtn') as HTMLButtonElement | null;

export const vigiliaSummaryModal = document.getElementById('vigiliaSummaryModal');
export const vigiliaSummaryTitle = document.getElementById('vigiliaSummaryTitle');
export const vigiliaSummaryDuration = document.getElementById('vigiliaSummaryDuration');
export const vigiliaSummaryPages = document.getElementById('vigiliaSummaryPages');
export const vigiliaSummaryProgress = document.getElementById('vigiliaSummaryProgress');
export const vigiliaSummaryPauses = document.getElementById('vigiliaSummaryPauses');
export const vigiliaSummarySaveStatus = document.getElementById('vigiliaSummarySaveStatus');
export const vigiliaSummaryContinueBtn = document.getElementById(
	'vigiliaSummaryContinueBtn',
) as HTMLButtonElement | null;
export const vigiliaSummaryExitLink = document.getElementById(
	'vigiliaSummaryExitLink',
) as HTMLAnchorElement | null;

export const saveBtn = document.getElementById('saveBtn');
export const saveLabel = document.getElementById('saveLabel');

export const selbar = document.getElementById('selbar');
export const rail = document.getElementById('rail');
export const delMarkBtn = document.getElementById('delMarkBtn') as HTMLButtonElement | null;
export const delSep = document.getElementById('delSep');
export const kwBtn = document.getElementById('kwBtn') as HTMLButtonElement | null;
export const kwSep = document.getElementById('kwSep');
