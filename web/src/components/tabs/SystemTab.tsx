import type { FC } from "react";
import { PageHeader } from "@/components/common";
import { BotSettingsCard, LiveLogsCard, ToolTracesCard } from "./system";

export const SystemTab: FC = () => {
	return (
		<div className="space-y-4">
			<PageHeader title="Settings" />
			<BotSettingsCard />
			<LiveLogsCard />
			<ToolTracesCard />
		</div>
	);
};
