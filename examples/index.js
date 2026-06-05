import React from "react";

function ExampleFrame({ title, tone, children }) {
  return React.createElement(
    "section",
    { className: `demo-workbench-example demo-workbench-example--${tone}` },
    React.createElement(
      "p",
      { className: "demo-workbench-example__eyebrow" },
      "demo-workbench example",
    ),
    React.createElement(
      "h1",
      { className: "demo-workbench-example__title" },
      title,
    ),
    React.createElement(
      "div",
      { className: "demo-workbench-example__body" },
      children,
    ),
  );
}

export function AlphaExample() {
  return React.createElement(
    ExampleFrame,
    { title: "Alpha product card", tone: "alpha" },
    React.createElement(
      "p",
      null,
      "A bright demo page with its own styled-atom css file.",
    ),
    React.createElement(
      "button",
      { type: "button", className: "demo-workbench-example__button" },
      "Open alpha",
    ),
  );
}

export function BetaExample() {
  return React.createElement(
    ExampleFrame,
    { title: "Beta dashboard panel", tone: "beta" },
    React.createElement(
      "p",
      null,
      "A dark demo page that proves per-demo css can differ.",
    ),
    React.createElement(
      "button",
      { type: "button", className: "demo-workbench-example__button" },
      "Open beta",
    ),
  );
}

export const exampleDemoPages = [
  {
    name: "Alpha example",
    cssFiles: ["examples/alpha.css"],
    load: async () => ({
      default: AlphaExample,
      cssFiles: ["examples/alpha.css"],
    }),
  },
  {
    name: "Beta example",
    cssFiles: ["examples/beta.css"],
    load: async () => ({
      default: BetaExample,
      cssFiles: ["examples/beta.css"],
    }),
  },
];

export function exampleCssLoader(name) {
  const cssByName = {
    "examples/alpha.css": () => import("./styles/alpha.css"),
    "examples/beta.css": () => import("./styles/beta.css"),
  };

  const load = cssByName[name];
  if (!load) return Promise.reject(new Error(`Unknown example css: ${name}`));
  return load();
}
