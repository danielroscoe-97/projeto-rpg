export const dynamic = "force-dynamic";

import { readFile } from "fs/promises";
import { join } from "path";

export default async function AdminJourneysPage() {
  const filePath = join(process.cwd(), "docs", "internal", "user-journey-flows.html");
  const html = await readFile(filePath, "utf-8");

  return (
    <iframe
      srcDoc={html}
      className="w-full border-0"
      style={{ height: "calc(100vh - 72px)" }}
      title="User Journey Flows"
      sandbox="allow-scripts"
    />
  );
}
