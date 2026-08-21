import { Bot, Edit3, PlusCircle, Sparkles, Wand2 } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
		title: "Educator / Tutor",
		desc: "Patient, pedagogical approach teaching step-by-step",
		prompt:
			"You are a patient, pedagogical, and instructive tutor. Simplify complex topics, provide real-world examples, and explain concepts step-by-step. Never use emojis in your responses.",
	},
	{
		title: "Senior Software Architect",
		desc: "System architecture and best practices specialist",
		prompt:
			"You are a meticulous software architect designing high-scale systems. Emphasize Clean Code, SOLID principles, and performance optimizations. Never use emojis in your responses.",
	},
	{
		title: "Philosopher & Analyst",
		desc: "Wise, analytical, and deeply reflective tone",
		prompt:
			"You are a thinker analyzing situations with depth, rationality, logic, and philosophical nuance. Keep insights clear, coherent, and well-grounded. Never use emojis in your responses.",
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
			<DialogContent className="max-w-lg w-[95vw] sm:w-full bg-card border-border shadow-2xl p-5 sm:p-6 rounded-2xl max-h-[85dvh] overflow-y-auto">
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-primary/10 text-primary">
							{isEdit ? (
								<Edit3 className="w-5 h-5" />
							) : (
								<Bot className="w-5 h-5" />
							)}
						</div>
						<DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
							{isEdit ? "Edit Persona" : "Create New Persona"}
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-muted-foreground">
						{isEdit
							? "Update how the bot behaves and speaks when this persona is active."
							: "Define a custom personality to guide how the bot behaves in chats."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{/* Name */}
					<div className="space-y-1.5">
						<label
							htmlFor="persona-name"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
						>
							Persona Name *
						</label>
						<Input
							id="persona-name"
							placeholder="e.g. Senior Architect, Analyst..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isSubmitting}
							className="bg-muted/40 border-border/80 focus:border-primary text-xs sm:text-sm"
							maxLength={60}
							required
						/>
					</div>

					{/* Short Description */}
					<div className="space-y-1.5">
						<label
							htmlFor="persona-description"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
						>
							Short Description (Optional)
						</label>
						<Input
							id="persona-description"
							placeholder="e.g. Solution-oriented technical developer"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isSubmitting}
							className="bg-muted/40 border-border/80 focus:border-primary text-xs sm:text-sm"
							maxLength={120}
						/>
					</div>

					{/* Prompt / System Instruction */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label
								htmlFor="persona-prompt"
								className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
							>
								System Prompt Instruction *
							</label>
							<span className="text-[10px] text-muted-foreground font-mono">
								{prompt.length} characters
							</span>
						</div>
						<Textarea
							id="persona-prompt"
							placeholder="Write the personality, tone, jargon, and rules the bot should follow when this persona is active..."
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							disabled={isSubmitting}
							rows={5}
							className="bg-muted/40 border-border/80 focus:border-primary font-mono text-xs leading-relaxed resize-none"
							required
						/>
					</div>

					{/* Templates Inspiration (for add mode) */}
					{!isEdit && (
						<div className="space-y-2 pt-1">
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<Wand2 className="w-3.5 h-3.5 text-primary" />
								<span>Quick Inspiration Templates:</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
								{INSPIRATION_TEMPLATES.map((tpl) => (
									<button
										key={tpl.title}
										type="button"
										onClick={() => applyTemplate(tpl)}
										className="p-2.5 text-left rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-primary/40 transition-all group"
									>
										<div className="flex items-center gap-1.5 text-xs font-medium text-foreground group-hover:text-primary">
											<Bot className="w-3.5 h-3.5 text-primary" />
											<span className="truncate">{tpl.title}</span>
										</div>
										<p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-normal">
											{tpl.desc}
										</p>
									</button>
								))}
							</div>
						</div>
					)}

					<DialogFooter className="pt-3 gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="gap-1.5 shadow-md shadow-primary/20"
						>
							{isSubmitting ? (
								<Sparkles className="w-4 h-4 animate-spin" />
							) : isEdit ? (
								<Edit3 className="w-4 h-4" />
							) : (
								<PlusCircle className="w-4 h-4" />
							)}
							<span>{isEdit ? "Save Changes" : "Create Persona"}</span>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
