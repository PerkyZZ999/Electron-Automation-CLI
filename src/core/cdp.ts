import { chromium, type Browser, type Page } from "playwright";

export interface CdpSession {
	browser: Browser;
	page: Page;
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

	const page = context.pages()[windowIndex];
	if (!page) {
		await browser.close();
		throw new Error(`Renderer window index out of range: ${windowIndex}`);
	}

	return {
		browser,
		page,
	};
}
