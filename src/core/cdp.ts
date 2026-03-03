import { chromium, type Browser, type Page } from "playwright";

export interface CdpSession {
	browser: Browser;
	page: Page;
}

function isBlankLikePage(page: Page): boolean {
	const url = page.url().trim().toLowerCase();
	return (
		url.length === 0 || url === "about:blank" || url.startsWith("devtools://")
	);
}

export async function connectCdp(
	wsEndpoint: string,
	windowIndex = 0,
): Promise<CdpSession> {
	const browser = await chromium.connectOverCDP(wsEndpoint);
	const context = browser.contexts()[0];

	if (!context) {
		await browser.close();
		throw new Error(
			"No renderer context available in the current Electron session.",
		);
	}

	const pages = context.pages();
	const preferredPages = pages.filter((page) => !isBlankLikePage(page));
	const orderedPages =
		preferredPages.length > 0
			? [...preferredPages, ...pages.filter((page) => isBlankLikePage(page))]
			: pages;

	const page = orderedPages[windowIndex];
	if (!page) {
		await browser.close();
		throw new Error(`Renderer window index out of range: ${windowIndex}`);
	}

	return {
		browser,
		page,
	};
}
