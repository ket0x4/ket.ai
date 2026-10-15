import { Bot, Edit3, PlusCircle, Wand2 } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { ModalFooter } from "@/components/common";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Input,
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import type { Persona } from "@/types";

interface PersonaModalProps {
	mode: "add" | "edit";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	persona?: Persona | null;
	onSuccess: () => void;
}

const INSPIRATION_TEMPLATES = [
	{
		title: "Tutor",
		desc: "Patient, step-by-step teaching",
		prompt:
			"You are a patient, pedagogical tutor. Simplify complex topics, use real-world examples, and explain step-by-step. Never use emojis.",
	},
	{
		title: "Architect",
		desc: "Systems and best practices",
		prompt:
			"You are a meticulous software architect. Emphasize clean code, SOLID principles, and performance. Never use emojis.",
	},
	{
		title: "Analyst",
		desc: "Reflective, analytical tone",
		prompt:
			"You analyze situations with depth, logic, and nuance. Keep insights clear and well-grounded. Never use emojis.",
	},
];

export const PersonaModal: FC<PersonaModalProps> = ({
	mode,
	open,
	onOpenChange,
	persona,
	onSuccess,
}) => {
	const isEdit = mode === "edit";
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [prompt, setPrompt] = useState("");
	const { isLoading: isSubmitting, execute } = useAsyncAction();

	useEffect(() => {
		if (isEdit && persona) {
			setName(persona.name || "");
			setDescription(persona.description || "");
			setPrompt(persona.prompt || "");
		} else if (!isEdit) {
			setName("");
			setDescription("");
			setPrompt("");
		}
	}, [isEdit, persona]);

	const applyTemplate = (tpl: (typeof INSPIRATION_TEMPLATES)[0]) => {
		setName(tpl.title);
		setDescription(tpl.desc);
		setPrompt(tpl.prompt);
		toast.info(`"${tpl.title}" template applied`);
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Please enter a persona name");
			return;
		}

		if (!prompt.trim()) {
			toast.error("Please enter a system prompt instruction");
			return;
		}

		await execute(
			async () => {
				if (isEdit && persona) {
					await api.personas.update(persona.id, {
						name: name.trim(),
						description: description.trim() || null,
						prompt: prompt.trim(),
						emoji: "",
					});
					toast.success("Persona updated successfully!");
				} else {
					await api.personas.create({
						name: name.trim(),
						description: description.trim() || undefined,
						prompt: prompt.trim(),
						emoji: "",
					});
					toast.success("New persona created successfully!");
				}
				onSuccess();
				onOpenChange(false);
			},
			{
				errorMessage: isEdit
					? "Error updating persona"
					: "Error creating persona",
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{isEdit ? (
							<Edit3 className="h-4 w-4 text-muted-foreground" />
						) : (
							<Bot className="h-4 w-4 text-muted-foreground" />
						)}
						<span>{isEdit ? "Edit persona" : "New persona"}</span>
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update how the bot behaves with this persona."
							: "Define how the bot speaks and behaves."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1.5">
						<label
							htmlFor="persona-name"
							className="text-xs text-muted-foreground"
						>
							Name
						</label>
						<Input
							id="persona-name"
							placeholder="e.g. Architect, Analyst…"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isSubmitting}
							className="text-xs sm:text-sm"
							maxLength={60}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="persona-description"
							className="text-xs text-muted-foreground"
						>
							Description{" "}
							<span className="text-muted-foreground/60">(optional)</span>
						</label>
						<Input
							id="persona-description"
							placeholder="e.g. Solution-oriented engineer"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isSubmitting}
							className="text-xs sm:text-sm"
							maxLength={120}
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label
								htmlFor="persona-prompt"
								className="text-xs text-muted-foreground"
							>
								System prompt
							</label>
							<span className="font-mono text-[10px] text-muted-foreground/60 tnum">
								{prompt.length}
							</span>
						</div>
						<Textarea
							id="persona-prompt"
							placeholder="Tone, rules, and jargon the bot should follow…"
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							disabled={isSubmitting}
							rows={5}
							className="resize-none font-mono text-xs leading-relaxed"
							required
						/>
					</div>

					{!isEdit && (
						<div className="space-y-2">
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Wand2 className="h-3.5 w-3.5" />
								<span>Templates</span>
							</div>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
								{INSPIRATION_TEMPLATES.map((tpl) => (
									<button
										key={tpl.title}
										type="button"
										onClick={() => applyTemplate(tpl)}
										className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-left transition-colors hover:border-border hover:bg-accent"
									>
										<div className="truncate text-xs font-medium text-foreground">
											{tpl.title}
										</div>
										<p className="mt-1 line-clamp-2 text-[10px] leading-normal text-muted-foreground">
											{tpl.desc}
										</p>
									</button>
								))}
							</div>
						</div>
					)}

					<ModalFooter
						onCancel={() => onOpenChange(false)}
						isSubmitting={isSubmitting}
						submitText={isEdit ? "Save" : "Create persona"}
						submitIcon={isEdit ? Edit3 : PlusCircle}
					/>
				</form>
			</DialogContent>
		</Dialog>
	);
};
