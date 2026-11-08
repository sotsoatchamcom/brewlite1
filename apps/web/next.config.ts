import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../../");

const nextConfig: NextConfig = {
    // Định vị chính xác thư mục gốc monorepo cho trình theo dõi file xuất ra
    outputFileTracingRoot: workspaceRoot,

    // Tắt cảnh báo workspace root của trình biên dịch Turbopack
    turbopack: {
        root: workspaceRoot,
    },
} as NextConfig;

export default nextConfig;