import { CheckCircle2 } from "lucide-react";
import type { FC } from "react";
import { CategoryBadge } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";

export interface ExtractedMemoriesBannerProps {
	memories: Array<{
		user_name: string;
		fact: string;
		category?: string;
		ttl_days?: number;
	}>;
}

export const ExtractedMemoriesBanner: FC<ExtractedMemoriesBannerProps> = ({
	memories,
}) => {
	if (!memories || memories.length === 0) return null;

	return (
		<Card className="border-emerald-500/30 bg-emerald-950/20 shadow-md animate-in fade-in duration-150">
			<CardContent className="p-4 space-y-2">
				<div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span>
						AI Extracted {memories.length} New Memory Update(s) to Save:
					</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
					{memories.map((m) => (
						<div
							key={`${m.user_name}-${m.fact.slice(0, 20)}`}
							className="p-2.5 rounded-lg bg-emerald-900/30 border border-emerald-500/20 text-xs space-y-1"
						>
							<div className="flex items-center justify-between">
								<span className="font-semibold text-emerald-300">
									{m.user_name}
								</span>
								<CategoryBadge category={m.category} variant="chip" />
							</div>
							<p className="text-zinc-200 text-[11px] leading-relaxed">
								{m.fact}
							</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
};
