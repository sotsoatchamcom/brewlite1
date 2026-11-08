import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Bỏ qua các thư mục build và tệp sinh tự động
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Tắt kiểm tra chặt kiểu any trong TypeScript
      "@typescript-eslint/no-explicit-any": "off",

      // Chuyển lỗi biến không sử dụng về mức cảnh báo (không chặn build)
      "@typescript-eslint/no-unused-vars": "warn",

      // Cho phép sử dụng thẻ <img> thông thường thay vì bắt buộc dùng next/image
      "@next/next/no-img-element": "off",

      // Tắt kiểm tra thiếu dependency trong useEffect (nếu cần bỏ qua cảnh báo hook)
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
