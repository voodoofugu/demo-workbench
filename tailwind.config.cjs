const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      transitionProperty: {
        width: "width",
        all1: "all",
      },
      transitionDuration: {
        width: "0.1s",
        all1: "0.4s",
      },
      transitionTimingFunction: {
        width: "ease-in-out",
        all1: "cubic-bezier(0.2, 0.85, 0.32, 1.2)",
      },
      animation: {
        appear: "appear 0.3s ease-in-out 0s 1 forwards",
        identifier: "identifier 0.2s ease-in-out 1 forwards",
        ident: "ident 0.2s ease-in-out 1 forwards",
      },
      keyframes: {
        appear: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        identifier: {
          "0%": { opacity: "0", width: "0" },
          "100%": { opacity: "1", width: "100%" },
        },
        ident: {
          "0%": { opacity: "0", scale: "0.8" },
          "100%": { opacity: "1", scale: "1" },
        },
      },
      boxShadow: {
        shadowColor6:
          "inset -1px -1px 3px #eaecfb, 1px 1px 3px #fff, inset 1px 1px 3px #abb1ed, -1px -1px 3px #969ee9",
        shadowColorDark7:
          "inset -1px -1px 3px #c0c5f2, 1px 1px 3px #eaecfb, inset 1px 1px 3px #818ae4, -1px -1px 3px #5763db",
        shadowColor8:
          "-1px -1px 2px #fff, inset 1px 1px 2px #dde0f8, 1px 1px 2px #818ae4, inset -1px -1px 2px #abb1ed",
        tooltipTemplate: "inset 1px 1px 2px #fff, inset -1px -1px 2px #969ee9",
        tooltipTemplateDark:
          "inset 1px 1px 2px #5c73be, inset -1px -1px 2px #25325c",
        toTopBtn:
          "-1px -1px 2px #fff, inset 1px 1px 2px #dde0f8, 1px 1px 2px #818ae4, inset -1px -1px 2px #abb1ed, 0 4px 10px #969ee9",
        darkColor1:
          "inset -1px -1px 3px #2c3c6e, 1px 1px 3px #3b5093, inset 1px 1px 3px #161e38, -1px -1px 3px #0f1425",
        darkThemeSearchInput:
          "inset -1px -1px 3px #abb1ed, 1px 1px 3px #3b5093, inset 1px 1px 3px #25325c, -1px -1px 3px #0f1425",
        darkThemeClearBtn:
          "-1px -1px 2px #969ee9, inset 1px 1px 2px #344680, 1px 1px 2px #161e38, inset -1px -1px 2px #1e284a",
        shadow1: "inset 0 0 0 2px rgb(129 140 248)",
        shadow2: "inset -4px -4px 0 #facc15",
        shadow3:
          "0 0 0 10px #c0c5f2, 20px 20px 40px #969ee9, -20px -20px 40px #fff",
        shadow7:
          "0 0 0 10px #1e284a, 20px 20px 40px #0f1425, -20px -20px 40px #3b5093",
        shadow4:
          "-4px -4px 8px #fff, inset 1px 1px 2px #fff, inset -1px -1px 2px #abb1ed, 4px 4px 8px #abb1ed",
        shadow8:
          "0 0 2px 1px #818ae4, -5px -5px 10px #fff, inset 1px 1px 2px #fff, inset -1px -1px 2px #abb1ed, 5px 5px 10px #abb1ed",
        shadow5:
          "-4px -4px 8px #3b5093, inset 1px 1px 2px #344680, inset -1px -1px 2px #161e38, 4px 4px 8px #161e38",
        shadow6:
          "0 0 2px 1px #818ae4, -5px -5px 10px #3b5093, inset 1px 1px 2px #344680, inset -1px -1px 2px #161e38, 5px 5px 10px #0f1425",
      },
      dropShadow: {
        dS1: "0.5px 0.5px 0.5px rgba(255, 255, 255, 1)",
        darkDS1: "0.5px 0.5px 0.5px #0b1126",
        tooltipDS: "0 1px 3px rgba(4, 3, 52, 0.6)",
      },
      textShadow: {
        tS1: "0.5px 0.5px 1px rgba(255, 255, 255, 0.6)",
        darkTS1: "0.5px 0.5px 1px rgba(255, 255, 255, 0.2)",
        tS1Black: "0.5px 0.5px 1px rgba(0, 0, 0, 0.8)",
      },
      colors: {
        searchInputPlaceholder: "#818ae4",
        tooltipTemplateTop: "#eaecfb",
        tooltipTemplateBottom: "#c0c5f2",
        toTopBtnIcon: "#818ae4",
        darkThemeToTopBtnIcon: "#99a2ff",
        darkThemeTooltipTemplateTop: "#5c73be",
        darkThemeTooltipTemplateBottom: "#344680",
        "indigo-1000": "#1c1842",
        "indigo-250": "#bbc8fc",
      },
      fontFamily: {
        custom: ["Roboto Flex", "Montserrat", "sans-serif"],
      },
      spacing: {
        1200: "1200px",
        1160: "1160px",
        640: "640px",
        238: "238px",
        214: "214px",
        184: "184px",
        156: "156px",
        62: "62px",
        48: "48px",
        46: "46px",
        40: "40px",
        34: "34px",
        32: "32px",
        30: "30px",
        26: "26px",
        25: "25px",
        24: "24px",
        16: "16px",
        15: "15px",
        14: "14px",
        13: "13px",
        12: "12px",
        10: "10px",
        9: "9px",
        6: "6px",
        5: "5px",
        4: "4px",
        3: "3px",
        2: "2px",
        1: "1px",
        0.5: "0.5px",
        "calcScreenH-112": "calc(100vh - 112px)",
        "calcFull-80": "calc(100% - 80px)",
        "calc50%-119": "calc(50% - 119px)",
        "calc50%-77": "calc(50% - 77px)",
        "50%": "50%",
      },
      borderRadius: {
        50: "50px",
        30: "30px",
        18: "18px",
        10: "10px",
        2: "2px",
      },
      borderWidth: {
        6: "6px",
        4: "4px",
      },
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "text-shadow": (value) => ({ textShadow: value }),
        },
        { values: theme("textShadow") },
      );
    }),
  ],
};
