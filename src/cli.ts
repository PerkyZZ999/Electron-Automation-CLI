#!/usr/bin/env bun
import { Command } from "commander";
import { registerLaunchCommand } from "./commands/launch";
import { registerCloseCommand } from "./commands/close";
import { registerGetTreeCommand } from "./commands/get-tree";
import { registerClickCommand } from "./commands/click";
import { registerFillCommand } from "./commands/fill";
import { registerEvalMainCommand } from "./commands/eval-main";
import { registerExpandedCommands } from "./commands/expanded";
import { registerDevtoolsCommands } from "./commands/devtools";
import { registerDoctorCommand } from "./commands/doctor";
import { registerLogsCommands } from "./commands/logs";
import { EXIT_CODE, fail } from "./utils/logger";

const program = new Command();

program
	.name("e-cli")
	.description("Token-efficient CLI for Electron automation via Playwright")
	.version("0.1.0");

registerLaunchCommand(program);
registerCloseCommand(program);
registerGetTreeCommand(program);
registerClickCommand(program);
registerFillCommand(program);
registerEvalMainCommand(program);
registerExpandedCommands(program);
registerDevtoolsCommands(program);
registerDoctorCommand(program);
registerLogsCommands(program);

try {
	await program.parseAsync(process.argv);
} catch (error) {
	const message = error instanceof Error ? error.message : "Unknown CLI error.";
	fail(`Error: ${message}`, EXIT_CODE.GENERAL);
}
