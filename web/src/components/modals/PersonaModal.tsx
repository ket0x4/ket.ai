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

const EMOJI_OPTIONS = [
	"🤖",
	"💻",
	"🐱",
	"👔",
	"🎮",
	"🎭",
	"⚡",
	"🧠",
	"🧙‍♂️",
	"🏴‍☠️",
	"🔥",
	"🚀",
	"🕵️",
	"☕",
	"✨",
];

const INSPIRATION_TEMPLATES = [
	{
		title: "Tutor / Eğitmen",
		emoji: "🧑‍🏫",
		desc: "Adım adım öğreten sabırlı öğretmen",
		prompt:
			"Sabırlı, pedagojik ve öğretici bir eğitmensin. Soruları basitleştirerek, gerçek hayattan örneklerle ve adım adım mantığını anlatarak açıkla.",
	},
	{
		title: "Korsan Kaptan",
		emoji: "🏴‍☠️",
		desc: "Denizci jargonuyla konuşan korsan",
		prompt:
			"Yedi denizlerin en neşeli ve bilge korsan kaptanısın! Ahoy, tayfa gibi denizci tabirleri kullan ve yanıtlarına macera dolu korsan havası kat.",
	},
	{
		title: "Kıdemli Mimar",
		emoji: "🏗️",
		desc: "Sistem mimarisi ve best practices uzmanı",
		prompt:
			"Yüksek ölçekli sistemler tasarlayan titiz bir yazılım mimarısın. Çözümlerinde Clean Code, SOLID ve performans optimizasyonlarına vurgu yap.",
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
	const [emoji, setEmoji] = useState("🤖");
	const { isLoading: isSubmitting, execute } = useAsyncAction();

	useEffect(() => {
		if (isEdit && persona) {
			setName(persona.name || "");
			setDescription(persona.description || "");
			setPrompt(persona.prompt || "");
			setEmoji(persona.emoji || "🤖");
		} else if (!isEdit) {
			setName("");
			setDescription("");
			setPrompt("");
			setEmoji("🤖");
		}
	}, [isEdit, persona]);

	const applyTemplate = (tpl: (typeof INSPIRATION_TEMPLATES)[0]) => {
		setName(tpl.title);
		setDescription(tpl.desc);
		setPrompt(tpl.prompt);
		setEmoji(tpl.emoji);
		toast.info(`"${tpl.title}" şablonu uygulandı`);
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Lütfen bir persona adı girin");
			return;
		}

		if (!prompt.trim()) {
			toast.error("Lütfen bir kişilik talimatı (prompt) girin");
			return;
		}

		await execute(
			async () => {
				if (isEdit && persona) {
					await api.personas.update(persona.id, {
						name: name.trim(),
						description: description.trim() || null,
						prompt: prompt.trim(),
						emoji,
					});
					toast.success("Persona başarıyla güncellendi!");
				} else {
					await api.personas.create({
						name: name.trim(),
						description: description.trim() || undefined,
						prompt: prompt.trim(),
						emoji,
					});
					toast.success("Yeni persona başarıyla oluşturuldu!");
				}
				onSuccess();
				onOpenChange(false);
			},
			{
				errorMessage: isEdit
					? "Persona güncellenirken hata oluştu"
					: "Persona oluşturulurken hata oluştu",
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg w-[95vw] sm:w-full bg-card border-border shadow-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-primary/10 text-primary">
							{isEdit ? (
								<Edit3 className="w-5 h-5" />
							) : (
								<Bot className="w-5 h-5" />
							)}
						</div>
						<DialogTitle className="text-xl font-bold tracking-tight">
							{isEdit ? "Personayı Düzenle" : "Yeni Persona Oluştur"}
						</DialogTitle>
					</div>
					<DialogDescription className="text-sm text-muted-foreground">
						{isEdit
							? "Botun bu kişilikte nasıl davranacağını ve tonunu güncelleyin."
							: "Botun istediğiniz gibi davranması için özel bir kişilik tanımı yapın."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{/* Emoji Selection */}
					<div className="space-y-1.5">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
							İkon / Emoji
						</span>
						<div className="flex items-center gap-2 flex-wrap">
							<div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl border border-border shrink-0">
								{emoji}
							</div>
							<div className="flex flex-wrap gap-1 max-w-[340px]">
								{EMOJI_OPTIONS.map((e) => (
									<button
										key={e}
										type="button"
										onClick={() => setEmoji(e)}
										className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
											emoji === e
												? "bg-primary text-primary-foreground scale-110 shadow-sm"
												: "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
										}`}
									>
										{e}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Name */}
					<div className="space-y-1.5">
						<label
							htmlFor="persona-name"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
						>
							Persona Adı *
						</label>
						<Input
							id="persona-name"
							placeholder="Örn: Sarkastik Kıdemli, Filozof Kedi..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isSubmitting}
							className="bg-muted/40 border-border/80 focus:border-primary"
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
							Kısa Açıklama (Opsiyonel)
						</label>
						<Input
							id="persona-description"
							placeholder="Örn: Kod hatalarına tatlı-sert iğnelemeler yapan yazılımcı"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isSubmitting}
							className="bg-muted/40 border-border/80 focus:border-primary"
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
								Kişilik Talimatı (System Prompt) *
							</label>
							<span className="text-[10px] text-muted-foreground font-mono">
								{prompt.length} karakter
							</span>
						</div>
						<Textarea
							id="persona-prompt"
							placeholder="Botun bu kişilikteyken takınacağı tavır, konuşma tarzı, jargonu ve kurallarını buraya yazın..."
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
								<span>Hızlı İlham Şablonları:</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
								{INSPIRATION_TEMPLATES.map((tpl) => (
									<button
										key={tpl.title}
										type="button"
										onClick={() => applyTemplate(tpl)}
										className="p-2 text-left rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-primary/40 transition-all group"
									>
										<div className="flex items-center gap-1 text-xs font-medium text-foreground group-hover:text-primary">
											<span>{tpl.emoji}</span>
											<span className="truncate">{tpl.title}</span>
										</div>
										<p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
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
							İptal
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
							<span>
								{isEdit ? "Değişiklikleri Kaydet" : "Personayı Oluştur"}
							</span>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
