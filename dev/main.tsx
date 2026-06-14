import React from "react";
import { createRoot } from "react-dom/client";

import DemoWorkbench from "../src";
import { exampleDemoPages } from "../examples";

import alphaCss from "../examples/styles/alpha.css?raw";
import betaCss from "../examples/styles/beta.css?raw";
import devCss from "./style.css?raw";

const cssByName: Record<string, string> = {
  output: devCss,
  "examples/alpha.css": alphaCss,
  "examples/beta.css": betaCss,
};

function styleLoader(name: string) {
  const css = cssByName[name];

  if (!css) {
    return Promise.reject(new Error(`Unknown dev CSS file: ${name}`));
  }

  return Promise.resolve({ default: css });
}

function App() {
  return (
    <DemoWorkbench
      title="demo-workbench dev"
      demos={exampleDemoPages}
      styleLoader={styleLoader}
      baseCssFiles={["output"]}
      viewport={{ width: 960, height: 540 }}
      renderDemoContent={(pageName) => (
        <p className="demo-workbench-dev-note">
          Opened from the local dev server: {pageName}
        </p>
      )}
    />
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
