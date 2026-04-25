import fs from "fs";
import path from "path";

describe("Sonner toaster layering", () => {
  it("pins the shared toaster above modal overlays", () => {
    const filePath = path.join(__dirname, "sonner.tsx");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("style={{ zIndex: 99999 }}");
  });
});
