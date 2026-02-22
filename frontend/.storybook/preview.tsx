import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import ja from "../src/translations/ja.json";

const preview: Preview = {
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ja" messages={ja}>
        <Story />
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
  },
};

export default preview;
