import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "../src/contexts/ToastContext";
import jaMessages from "../src/translations/ja.json";
import "../src/styles/globals.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ja" messages={jaMessages}>
        <ToastProvider>
          <Story />
        </ToastProvider>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    viewport: {
      viewports: {
        spSmall: {
          name: "SP Small (375px)",
          styles: { width: "375px", height: "812px" },
        },
        spMedium: {
          name: "SP Medium (390px)",
          styles: { width: "390px", height: "844px" },
        },
        spLarge: {
          name: "SP Large (430px)",
          styles: { width: "430px", height: "932px" },
        },
        tablet: {
          name: "Tablet (768px)",
          styles: { width: "768px", height: "1024px" },
        },
        pc: {
          name: "PC (580px)",
          styles: { width: "580px", height: "900px" },
        },
      },
      defaultViewport: "spSmall",
    },
  },
};

export default preview;
