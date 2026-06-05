const LoadCss = `

  @keyframes rotate-one {
    0% {
      transform: rotateX(60deg) rotate(0deg);
    }
    100% {
      transform: rotateX(60deg) rotate(360deg);
    }
  }

  @keyframes rotateLoad {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes ripple {
    0% {
      transform: translate(-50%, -50%) scale(0.2);
      opacity: 0.8;
    }
    50% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(0.2);
      opacity: 0.8;
    }
  }

  .blurBg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(4, 8, 42, 0.4);
    backdrop-filter: blur(10px);
  }
  .loader {
    position: absolute;
    top: calc(50% - 32px);
    left: calc(50% - 32px);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    perspective: 800px;
    filter: drop-shadow(0 0 2px #d9d8f0) drop-shadow(0 0 6px rgba(0, 0, 0, 0.4));
    animation: rotateLoad 10s linear infinite;
    &:before,
    &:after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 20%;
      height: 20%;
      border-radius: 100%;
      background: #fff;
    }
    &:before {
      animation: ripple 2s linear infinite;
    }
    &:after {
      opacity: 0;
      animation: ripple 2s linear infinite 1s;
    }
    .inner {
      position: absolute;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border-top: 2px solid #efeffa;
      border-right: 3px solid #f0f0ff;
      animation: rotate-one 1s linear infinite;
      &:before {
        content: "";
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%) rotate3d(0, 1, 0, 304deg);
        box-sizing: border-box;
        width: 12px;
        height: 4px;
        border-radius: 10% 100% 10% 100%;
        background: #fff;
      }

      &.one {
        rotate: 0deg;
      }

      &.two {
        rotate: 120deg;
      }

      &.three {
        rotate: 240deg;
      }
    }
  }
`;

import type { CSSProperties } from "react";

export default function Loading({
  noBG,
  addStyle,
}: {
  noBG?: boolean;
  addStyle?: CSSProperties;
}) {
  return (
    <>
      <style>{LoadCss}</style>
      {!noBG && <div className="blurBg"></div>}
      <div className="loader" style={addStyle ? addStyle : undefined}>
        <div className="inner one"></div>
        <div className="inner two"></div>
        <div className="inner three"></div>
      </div>
    </>
  );
}
