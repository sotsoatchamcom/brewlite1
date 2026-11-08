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
      // 1. Bỏ qua ép kiểu TypeScript
      "@typescript-eslint/no-explicit-any": "off",

      // 2. Chuyển biến thừa thành warning để không chặn build
      "@typescript-eslint/no-unused-vars": "warn",

      // 3. Cho phép dùng thẻ <img> HTML thuần
      "@next/next/no-img-element": "off",

      // 4. Tắt rule setState trong useEffect của React 19
      "react-hooks/set-state-in-effect": "off",

      // 5. Cảnh báo nhẹ về dependency hooks
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
