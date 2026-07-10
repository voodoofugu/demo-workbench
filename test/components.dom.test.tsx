import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import nexus from "../src/state/nexus";
import ThemeMenu from "../src/components/ThemeMenu";
import SearchControl from "../src/components/SearchControl";
import ToggleButton from "../src/components/buttons/ToggleButton";
import PageCloseBtn from "../src/components/buttons/PageCloseBtn";
import DemoCell from "../src/components/DemoCell";
import type { DemoComponentProps } from "../src/types/public";

beforeEach(() => {
  nexus.set({
    themeColor: "grey",
    darkTheme: false,
    searchText: "",
    activePage: "",
  });
});

afterEach(() => {
  cleanup();
});

test("ThemeMenu opens, marks the active color and applies a selection", () => {
  render(<ThemeMenu title="Project demos" />);

  // Closed by default.
  expect(screen.queryByRole("menu")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /project demos/i }));
  expect(screen.getByRole("menu")).toBeTruthy();

  // Grey is the default, so its option is checked.
  expect(
    screen
      .getByRole("menuitemradio", { name: /grey/i })
      .getAttribute("aria-checked"),
  ).toBe("true");

  fireEvent.click(screen.getByRole("menuitemradio", { name: /blue/i }));

  expect(nexus.get("themeColor")).toBe("blue");
  // Selecting a color closes the menu.
  expect(screen.queryByRole("menu")).toBeNull();
});

test("ThemeMenu closes on Escape without changing the color", () => {
  render(<ThemeMenu title="Project demos" />);
  fireEvent.click(screen.getByRole("button", { name: /project demos/i }));
  expect(screen.getByRole("menu")).toBeTruthy();

  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("menu")).toBeNull();
  expect(nexus.get("themeColor")).toBe("grey");
});

test("SearchControl writes the query into nexus and the clear button resets it", () => {
  render(<SearchControl />);
  const input = screen.getByPlaceholderText("Search");

  // Focus the control so its button acts as a clear button.
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "dashboard" } });
  expect(nexus.get("searchText")).toBe("dashboard");
  expect((input as HTMLInputElement).value).toBe("dashboard");

  fireEvent.mouseUp(screen.getByRole("button"));
  expect(nexus.get("searchText")).toBe("");
});

test("ToggleButton flips darkTheme in nexus and reflects it on the element", () => {
  render(<ToggleButton />);
  const button = screen.getByRole("button", { name: /toggle dark theme/i });
  expect(button.getAttribute("data-active")).toBe("false");

  fireEvent.click(button);
  expect(nexus.get("darkTheme")).toBe(true);
  expect(button.getAttribute("data-active")).toBe("true");

  fireEvent.click(button);
  expect(nexus.get("darkTheme")).toBe(false);
});

test("a demo receives isActive=true only when opened as a page", () => {
  const received: DemoComponentProps[] = [];
  function Spy(props: DemoComponentProps) {
    received.push(props);
    return <div>demo body</div>;
  }
  const demo = {
    name: "Screen",
    load: async () => ({ default: Spy }),
    Component: Spy,
  };

  const { rerender } = render(<DemoCell demo={demo} mode="card" />);
  expect(received.at(-1)?.isActive).toBe(false);

  rerender(<DemoCell demo={demo} mode="page" />);
  expect(received.at(-1)?.isActive).toBe(true);
});

test("PageCloseBtn fades out after inactivity and reappears on mouse move", () => {
  vi.useFakeTimers();
  try {
    render(<PageCloseBtn onClick={() => undefined} />);
    const button = screen.getByRole("button", { name: /close demo/i });

    // Visible on mount.
    expect(button.style.opacity).toBe("1");

    // A move (re)arms the 2s hide timer.
    act(() => {
      window.dispatchEvent(new window.MouseEvent("mousemove"));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button.style.opacity).toBe("0");

    // Moving again brings it back immediately.
    act(() => {
      window.dispatchEvent(new window.MouseEvent("mousemove"));
    });
    expect(button.style.opacity).toBe("1");
  } finally {
    vi.useRealTimers();
  }
});
