import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";
import globals from "globals";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "plugin:@typescript-eslint/recommended", "prettier"),
    {
        files: ["app/**/*.ts", "app/**/*.tsx", "types/**/*.ts", "components/**/*.tsx"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "react-hooks/exhaustive-deps": "warn",
            "@next/next/no-img-element": "warn",
            "react/no-unescaped-entities": "warn",
            "prefer-const": "warn",
            "no-var": "error",
            "@typescript-eslint/ban-ts-comment": "off",
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "react/prop-types": "off",
        },
    },
    {
        files: ["__tests__/**/*.ts", "__tests__/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.jest.json",
            },
            globals: {
                ...globals.jest,
                ...globals.node,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "react/react-in-jsx-scope": "off",
        },
    },
    {
        files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        }
    },
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
            "coverage/**",
            "test-artifacts/**",
            "*.config.js",
            "*.config.mjs",
            "fix-*.js",
            "**/*.d.ts",
            "scripts/optimized-test-runner.js"
        ],
    },
];

export default tseslint.config(...eslintConfig);
