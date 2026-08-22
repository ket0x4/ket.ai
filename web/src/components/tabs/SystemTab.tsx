import type { FC } from "react";
import { BotSettingsCard, LiveLogsCard, ToolTracesCard } from "./system";

export const SystemTab: FC = () => {
	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<BotSettingsCard />
			<LiveLogsCard />
			<ToolTracesCard />
		</div>
	);
};
