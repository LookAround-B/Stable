import fs from "fs";
import path from "path";

describe("GrassBeddingPage timestamp layout", () => {
  it("gives the timestamp picker a wider span in the add entry modal", () => {
    const filePath = path.join(__dirname, "GrassBeddingPage.js");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain('className="sm:col-span-2 lg:col-span-2"');
    expect(source).toContain("<DateTimePicker value={formData.collectedAt}");
  });

  it("uses app-themed stepper buttons for the weight input instead of the browser default spinner", () => {
    const filePath = path.join(__dirname, "GrassBeddingPage.js");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("const handleWeightStep =");
    expect(source).toContain("grass-bedding-stepper");
    expect(source).toContain("ChevronUp");
    expect(source).toContain("ChevronDown");
  });
});
