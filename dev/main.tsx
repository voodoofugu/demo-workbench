import React from "react";
import { createRoot } from "react-dom/client";

import DemoWorkbench from "../src";
import generatedWorkbenchRegistry from "../src/state/generatedWorkbenchRegistry";
import { AlphaExample, BetaExample } from "../examples";

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

const demoModules = {
  "Alpha example": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example2`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example2": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example3`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example3": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example4`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example4": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example5": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example6": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example6`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example7": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example7`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example8": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
  "Alpha example8`": {
    default: AlphaExample,
    cssFiles: ["examples/alpha.css"],
  },
  "Beta example9": {
    default: BetaExample,
    cssFiles: ["examples/beta.css"],
  },
};

// In host projects `runWorkbenchCompile` writes demo names into the generated
// registry; the dev sandbox registers its example demos the same way.
// generatedWorkbenchRegistry.demos = [];
generatedWorkbenchRegistry.demos.push(...Object.keys(demoModules));

function demoLoader(name: string) {
  const demo = demoModules[name as keyof typeof demoModules];

  if (!demo) {
    return Promise.reject(new Error(`Unknown dev demo: ${name}`));
  }

  return Promise.resolve(demo);
}

function App() {
  return (
    <DemoWorkbench
      title="demo-workbench dev"
      demoLoader={demoLoader}
      styleLoader={styleLoader}
      baseStyles={["output"]}
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
