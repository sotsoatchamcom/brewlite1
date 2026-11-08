import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 1. Tắt ép kiểu chặt TypeScript & hạ cảnh báo biến thừa
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",

      // 2. Next.js Rules
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "off",

      // 3. Tắt các quy tắc nghiêm ngặt của React 19 / React Compiler
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
