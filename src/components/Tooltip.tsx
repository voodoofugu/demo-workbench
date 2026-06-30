import { useState } from "react";
import type { Dispatch, MouseEvent, ReactNode, SetStateAction } from "react";
import { createPortal } from "react-dom";

import FileIcn from "./icons/FileIcn";

type TooltipProps = {
  children: ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
};

type TooltipData = {
  top: number;
  left: number;
  text: string;
  placement: "top" | "bottom" | "side-left" | "side-right";
  align?: "left" | "center" | "right";
};

function addTooltipData(
  event: MouseEvent,
  setTooltipData: Dispatch<SetStateAction<TooltipData | null>>,
  render: boolean,
  setRender: Dispatch<SetStateAction<boolean>>,
  setVisible: Dispatch<SetStateAction<boolean>>,
  text: TooltipProps["text"],
  position: TooltipProps["position"],
) {
  if (render || typeof window === "undefined") return;

  const target = event.currentTarget as HTMLElement;
  const { left, top, height, width } = target.getBoundingClientRect();
  const centerY = top + height / 2;
  const centerX = left + width / 2;

  const halfHeight = window.innerHeight / 2;
  const oneThirdWidth = window.innerWidth / 3;

  const newTooltipData: TooltipData = {
    text,
    top: 0,
    left: 0,
    placement: "bottom",
    align: "center",
  };

  if (position) {
    if (position === "top") {
      newTooltipData.top = top;
      newTooltipData.left = centerX;
      newTooltipData.placement = "top";
      newTooltipData.align = "center";
    } else if (position === "bottom") {
      newTooltipData.top = top + height;
      newTooltipData.left = centerX;
      newTooltipData.placement = "bottom";
      newTooltipData.align = "center";
    } else if (position === "left") {
      newTooltipData.top = centerY;
      newTooltipData.left = left + width;
      newTooltipData.placement = "side-left";
      newTooltipData.align = undefined;
    } else if (position === "right") {
      newTooltipData.top = centerY;
      newTooltipData.left = left;
      newTooltipData.placement = "side-right";
      newTooltipData.align = undefined;
    }
  } else {
    if (centerY < halfHeight) {
      newTooltipData.top = top + height;
      newTooltipData.placement = "bottom";
    } else {
      newTooltipData.top = top;
      newTooltipData.placement = "top";
    }

    if (centerX < oneThirdWidth) {
      newTooltipData.left = left;
      newTooltipData.align = "left";
    } else if (centerX > oneThirdWidth * 2) {
      newTooltipData.left = left + width;
      newTooltipData.align = "right";
    } else {
      newTooltipData.left = centerX;
      newTooltipData.align = "center";
    }
  }

  window.setTimeout(() => {
    setTooltipData(newTooltipData);
    setRender(true);
  }, 100);
  window.setTimeout(() => {
    setVisible(true);
  }, 1000);
}

export function removeTooltipData(
  setTooltipData: Dispatch<SetStateAction<TooltipData | null>>,
  setRender: Dispatch<SetStateAction<boolean>>,
  setVisible: Dispatch<SetStateAction<boolean>>,
) {
  setVisible(false);
  window.setTimeout(() => {
    setRender(false);
    setTooltipData(null);
  }, 200);
}

export default function Tooltip({ children, text, position }: TooltipProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [render, setRender] = useState(false);
  const [visible, setVisible] = useState(false);

  const portalTarget =
    typeof document !== "undefined"
      ? (document.querySelector("#templateBody > main") ??
        document.querySelector("#templateBody") ??
        document.body)
      : null;

  return (
    <div
      tooltip-layer=""
      className="demo-workbench-tooltip-target"
      onMouseEnter={(event) =>
        addTooltipData(
          event,
          setTooltipData,
          render,
          setRender,
          setVisible,
          text,
          position,
        )
      }
      onMouseLeave={() =>
        removeTooltipData(setTooltipData, setRender, setVisible)
      }
    >
      {children}
      {render && portalTarget
        ? createPortal(
            <div
              className="demo-workbench-tooltip"
              data-visible={visible ? "true" : "false"}
              data-placement={tooltipData?.placement}
              data-align={tooltipData?.align}
              style={{
                top: tooltipData?.top,
                left: tooltipData?.left,
              }}
              id={text}
            >
              <FileIcn
                className="demo-workbench-tooltip-icon"
                style={null}
              />
              {tooltipData?.text}
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
