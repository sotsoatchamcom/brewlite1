import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Tắt kiểm tra chặt kiểu any trong TypeScript
      "@typescript-eslint/no-explicit-any": "off",
      // Tắt cảnh báo gọi setState trực tiếp trong useEffect
      "react-hooks/set-state-in-effect": "off",
      // Chuyển lỗi biến không sử dụng về mức cảnh báo (không chặn build)
      "@typescript-eslint/no-unused-vars": "warn",
      // Cho phép sử dụng thẻ <img> thông thường thay vì bắt buộc dùng next/image
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
