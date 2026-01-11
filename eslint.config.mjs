import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "**/*.config.mjs",
            "jest.config.js",
            "**/*.spec.ts",
        ],
    },

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: new URL(".", import.meta.url).pathname,
            },
        },
        rules: {
            "no-console": "off",
            "dot-notation": "error",
        },
    }
);
