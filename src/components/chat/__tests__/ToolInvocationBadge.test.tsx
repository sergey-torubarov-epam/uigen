import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// getToolLabel unit tests

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/utils.ts" })).toBe("Editing utils.ts");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading App.jsx");
});

test("getToolLabel: file_manager rename uses new_path filename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming new.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/components/Old.tsx" })).toBe("Deleting Old.tsx");
});

test("getToolLabel: unknown tool returns tool name", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getToolLabel: nested path extracts filename only", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Card.tsx" })).toBe("Creating Card.tsx");
});

// ToolInvocationBadge rendering tests

test("shows label with spinner when not done", () => {
  render(<ToolInvocationBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="call" />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(document.querySelector(".animate-spin")).toBeDefined();
  expect(document.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows label with green dot when done", () => {
  render(<ToolInvocationBadge toolName="str_replace_editor" args={{ command: "str_replace", path: "/App.jsx" }} state="result" result="ok" />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
  expect(document.querySelector(".bg-emerald-500")).toBeDefined();
  expect(document.querySelector(".animate-spin")).toBeNull();
});

test("shows spinner when result is falsy", () => {
  render(<ToolInvocationBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="result" result={null} />);
  expect(document.querySelector(".animate-spin")).toBeDefined();
});

test("falls back to tool name for unknown tool", () => {
  render(<ToolInvocationBadge toolName="unknown_tool" args={{}} state="call" />);
  expect(screen.getByText("unknown_tool")).toBeDefined();
});
