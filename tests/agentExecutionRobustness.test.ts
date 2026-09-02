import { describe, expect, test } from "bun:test";
import { GeminiService } from "../src/services/gemini/index";
import { ai } from "../src/services/gemini/client";
import { toolRegistry } from "../src/agent/index";
import type { AgentTool } from "../src/agent/types";

function createMockHistory(text = "Calculate something") {
	return [
		{
			id: 1,
			chat_id: 12345,
			message_id: 10,
			user_id: 100,
			username: "testuser",
			first_name: "Test",
			text,
			is_bot_reply: false,
			reply_to_message_id: null,
			photo_file_id: null,
			voice_file_id: null,
			created_at: 1000,
		},
	];
}

describe("Agent Execution Robustness", () => {
	test("sanitizes heavy base64 data from tool results before sending to Gemini LLM context", async () => {
		const originalGenerateContent = ai.models.generateContent;
		const capturedContents: Array<any> = [];
		let onMediaCalled = false;

		// Register dummy artifact producing tool
		const dummyArtifactTool: AgentTool = {
			name: "generate_mock_chart",
			description: "Generates mock chart with base64 data",
			parameters: { type: "OBJECT", properties: {} },
			execute: async () => ({
				success: true,
				stdout: "Chart rendered",
				exit_code: 0,
				artifacts: [
					{
						filename: "large_chart.png",
						mimeType: "image/png",
						type: "image",
						sizeBytes: 1048576,
						data: "A".repeat(50000), // Large 50KB base64 string
					},
				],
			}),
		};
		toolRegistry.register(dummyArtifactTool);

		let turnCount = 0;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK
		(ai.models as any).generateContent = async (params: any) => {
			turnCount++;
			capturedContents.push(JSON.parse(JSON.stringify(params.contents)));

			if (turnCount === 1) {
				// Turn 1: Request tool execution with call id
				return {
					candidates: [
						{
							content: {
								role: "model",
								parts: [
									{
										functionCall: {
											id: "call_mock_123",
											name: "generate_mock_chart",
											args: {},
										},
									},
								],
							},
						},
					],
				};
			}

			// Turn 2: Return final model reply
			return {
				text: "Here is your generated chart!",
			};
		};

		try {
			const reply = await GeminiService.generateReply(
				createMockHistory("generate a chart"),
				null,
				false,
				undefined,
				"12345",
				undefined,
				async (media) => {
					onMediaCalled = true;
					expect(media.length).toBe(1);
					expect(media[0].filename).toBe("large_chart.png");
					expect(media[0].buffer.length).toBeGreaterThan(0);
				},
			);

			expect(reply).toBe("Here is your generated chart!");
			expect(onMediaCalled).toBeTrue();

			// Verify Turn 2 contents sent to Gemini
			expect(capturedContents.length).toBe(2);
			const turn2Contents = capturedContents[1];
			// Find tool response part
			const userTurn = turn2Contents.find(
				(c: any) => c.role === "user" && c.parts?.some((p: any) => p.functionResponse),
			);
			expect(userTurn).toBeDefined();

			const functionResp = userTurn.parts.find((p: any) => p.functionResponse)
				.functionResponse;
			expect(functionResp.name).toBe("generate_mock_chart");
			expect(functionResp.id).toBe("call_mock_123");

			// Crucial check: base64 'data' must NOT exist in the LLM functionResponse
			const sentArtifacts = functionResp.response.result.artifacts;
			expect(sentArtifacts).toBeDefined();
			expect(sentArtifacts.length).toBe(1);
			expect(sentArtifacts[0].filename).toBe("large_chart.png");
			expect(sentArtifacts[0].data).toBeUndefined(); // Stripped!
			expect(sentArtifacts[0].has_data).toBeTrue();
		} finally {
			ai.models.generateContent = originalGenerateContent;
			toolRegistry.unregister("generate_mock_chart");
		}
	});

	test("extracts alternative JSON fields (text, summary, message, answer, result) without suppressing reply", async () => {
		const originalGenerateContent = ai.models.generateContent;

		const testCases = [
			{ json: { text: "Calculated answer is 42" }, expected: "Calculated answer is 42" },
			{ json: { message: "Task completed successfully" }, expected: "Task completed successfully" },
			{ json: { summary: "Report ready" }, expected: "Report ready" },
			{ json: { answer: "The capital is Ankara" }, expected: "The capital is Ankara" },
			{ json: { result: "All tests passed" }, expected: "All tests passed" },
		];

		try {
			for (const tc of testCases) {
				// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK
				(ai.models as any).generateContent = async () => ({
					text: JSON.stringify(tc.json),
				});

				const reply = await GeminiService.generateReply(
					createMockHistory(),
					null,
					false,
					undefined,
					"12345",
				);
				expect(reply).toBe(tc.expected);
			}
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("does not suppress reply when model returns malformed JSON with markdown blocks", async () => {
		const originalGenerateContent = ai.models.generateContent;

		// Model outputs JSON-like text that fails JSON.parse (e.g. unquoted keys or comments)
		const rawModelText = "```json\n{\n  unquoted_key: 'value',\n  // note\n  output: 100\n}\n```";

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK
		(ai.models as any).generateContent = async () => ({
			text: rawModelText,
		});

		try {
			const reply = await GeminiService.generateReply(
				createMockHistory(),
				null,
				false,
				undefined,
				"12345",
			);
			// Cleaned text should be returned, NOT empty string
			expect(reply.length).toBeGreaterThan(0);
			expect(reply).toContain("unquoted_key");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});
});
