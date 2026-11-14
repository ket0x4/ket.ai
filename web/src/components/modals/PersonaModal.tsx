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
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Enter a name.");
			return;
		}

		if (!prompt.trim()) {
			toast.error("Enter a system prompt.");
			return;
		}

		await execute(
			async () => {
				if (isEdit && persona) {
					await api.personas.update(persona.id, {
						name: name.trim(),
						description: description.trim() || null,
						prompt: prompt.trim(),
					});
				} else {
					await api.personas.create({
						name: name.trim(),
						description: description.trim() || undefined,
						prompt: prompt.trim(),
					});
				}
				onSuccess();
				onOpenChange(false);
			},
			{
				successMessage: isEdit ? "Persona updated." : "Persona created.",
				errorMessage: "Could not save persona",
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit persona" : "New persona"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "Update this persona." : "Define how the bot speaks."}
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
							placeholder="e.g. Architect"
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
							Description <span className="opacity-60">optional</span>
						</label>
						<Input
							id="persona-description"
							placeholder="One line"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isSubmitting}
							className="text-xs sm:text-sm"
							maxLength={120}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="persona-prompt"
							className="text-xs text-muted-foreground"
						>
							System prompt
						</label>
						<Textarea
							id="persona-prompt"
							placeholder="Tone and rules…"
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
							<div className="text-xs text-muted-foreground">Templates</div>
							<div className="grid grid-cols-3 gap-1.5">
								{INSPIRATION_TEMPLATES.map((tpl) => (
									<button
										key={tpl.title}
										type="button"
										onClick={() => applyTemplate(tpl)}
										className="rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 text-left hover:border-border hover:bg-accent"
									>
										<span className="block truncate text-xs font-medium text-foreground">
											{tpl.title}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					<ModalFooter
						onCancel={() => onOpenChange(false)}
						isSubmitting={isSubmitting}
						submitText={isEdit ? "Save" : "Create"}
					/>
				</form>
			</DialogContent>
		</Dialog>
	);
};
