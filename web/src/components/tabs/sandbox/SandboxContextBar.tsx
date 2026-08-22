import { Activity, Bot, Brain, Database } from "lucide-react";
import type { FC } from "react";
import { ChatSelect } from "@/components/common";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Chat, Persona } from "@/types";

export interface SandboxContextBarProps {
	chats: Chat[];
	personas: Persona[];
	selectedChatId: string;
	onSelectChatId: (id: string) => void;
	selectedPersonaId: string;
	onSelectPersonaId: (id: string) => void;
	enableMemory: boolean;
	onToggleMemory: (val: boolean) => void;
	verbose: boolean;
	onToggleVerbose: (val: boolean) => void;
	disabled: boolean;
}

export const SandboxContextBar: FC<SandboxContextBarProps> = ({
	chats,
	personas,
	selectedChatId,
	onSelectChatId,
	selectedPersonaId,
	onSelectPersonaId,
	enableMemory,
	onToggleMemory,
	verbose,
	onToggleVerbose,
	disabled,
}) => {
	return (
		<div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
			<div className="space-y-1.5">
				<label
					htmlFor="sandbox-chat-select"
					className="text-xs font-semibold text-foreground flex items-center gap-1.5"
				>
					<Database className="w-3.5 h-3.5 text-primary" />
					<span>Target Chat Memory</span>
				</label>
				<ChatSelect
					id="sandbox-chat-select"
					value={selectedChatId}
					onValueChange={onSelectChatId}
					chats={chats}
					showMemoryCount={true}
					disabled={disabled}
					placeholder="Select chat context..."
					triggerClassName="bg-background/80"
				/>
			</div>

			<div className="space-y-1.5">
				<label
					htmlFor="sandbox-persona-select"
					className="text-xs font-semibold text-foreground flex items-center gap-1.5"
				>
					<Bot className="w-3.5 h-3.5 text-blue-400" />
					<span>Agent Persona</span>
				</label>
				<Select
					value={selectedPersonaId}
					onValueChange={onSelectPersonaId}
					disabled={disabled}
				>
					<SelectTrigger
						id="sandbox-persona-select"
						className="h-9 text-xs bg-background/80"
					>
						<SelectValue placeholder="Default persona..." />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="default">
							<div className="flex items-center gap-1.5 text-xs">
								<Bot className="w-3.5 h-3.5 text-primary" />
								<span>Default Persona</span>
							</div>
						</SelectItem>
						{personas.map((p) => (
							<SelectItem key={p.id} value={p.id}>
								<div className="flex items-center gap-1.5 text-xs">
									<Bot className="w-3.5 h-3.5 text-blue-400" />
									<span className="font-medium" dir="auto">
										{p.name}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40 h-9">
				<label
					htmlFor="toggle-memory-rag"
					className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none"
				>
					<Brain
						className={`w-3.5 h-3.5 ${
							enableMemory ? "text-emerald-400" : "text-zinc-400"
						}`}
					/>
					<span>RAG Memory</span>
				</label>
				<Switch
					id="toggle-memory-rag"
					checked={enableMemory}
					onCheckedChange={onToggleMemory}
					disabled={disabled}
				/>
			</div>

			<div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40 h-9">
				<label
					htmlFor="toggle-verbose-output"
					className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none"
				>
					<Activity
						className={`w-3.5 h-3.5 ${
							verbose ? "text-purple-400" : "text-zinc-400"
						}`}
					/>
					<span>Verbose Output</span>
				</label>
				<Switch
					id="toggle-verbose-output"
					checked={verbose}
					onCheckedChange={onToggleVerbose}
					disabled={disabled}
				/>
			</div>
		</div>
	);
};
