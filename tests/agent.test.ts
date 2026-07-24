import { describe, test, expect, beforeEach } from "bun:test";
import { ToolRegistry, AgentTool } from "../src/agent/types";
import { ToolRegistry as RegistryClass } from "../src/agent/registry";
import { webSearchTool, performWebSearch } from "../src/agent/tools/webSearch";

describe("ToolRegistry", () => {
  let registry: RegistryClass;

  beforeEach(() => {
    registry = new RegistryClass();
  });

  test("should register and execute a custom tool", async () => {
    const dummyTool: AgentTool<{ a: number; b: number }, { sum: number }> = {
      name: "add_numbers",
      description: "Adds two numbers together",
      parameters: {
        type: "OBJECT",
        properties: {
          a: { type: "NUMBER", description: "First number" },
          b: { type: "NUMBER", description: "Second number" },
        },
        required: ["a", "b"],
      },
      execute: async ({ a, b }) => ({ sum: a + b }),
    };

    registry.register(dummyTool);
    expect(registry.count).toBe(1);
    expect(registry.hasTool("add_numbers")).toBeTrue();

    const declarations = registry.getFunctionDeclarations();
    expect(declarations.length).toBe(1);
    expect(declarations[0].name).toBe("add_numbers");

    const result = await registry.executeTool("add_numbers", { a: 10, b: 15 });
    expect(result).toEqual({ sum: 25 });
  });

  test("should return error object for unregistered tool execution", async () => {
    const result = await registry.executeTool("non_existent", {});
    expect(result).toHaveProperty("error");
  });

  test("should unregister a tool cleanly", () => {
    const dummyTool: AgentTool = {
      name: "temp_tool",
      description: "Temp",
      parameters: { type: "OBJECT", properties: {} },
      execute: async () => ({}),
    };

    registry.register(dummyTool);
    expect(registry.hasTool("temp_tool")).toBeTrue();
    registry.unregister("temp_tool");
    expect(registry.hasTool("temp_tool")).toBeFalse();
  });
});

describe("WebSearchTool", () => {
  test("should have valid AgentTool metadata", () => {
    expect(webSearchTool.name).toBe("web_search");
    expect(webSearchTool.description).toBeDefined();
    expect(webSearchTool.parameters.properties.query).toBeDefined();
  });

  test("should handle empty query gracefully", async () => {
    const res = await webSearchTool.execute({ query: "   " });
    expect(res.count).toBe(0);
    expect(res.results).toEqual([]);
  });

  test("should perform real search or return structured results", async () => {
    const res = await webSearchTool.execute({ query: "dolar kac tl" });
    expect(res).toHaveProperty("query");
    expect(res).toHaveProperty("results");
    expect(Array.isArray(res.results)).toBeTrue();
  });
});
