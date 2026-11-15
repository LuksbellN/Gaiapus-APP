import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Tests read the Portuguese source text: the simulated browser prefers pt-BR.
Object.defineProperty(window.navigator, "languages", { value: ["pt-BR", "pt"], configurable: true });
afterEach(cleanup);
