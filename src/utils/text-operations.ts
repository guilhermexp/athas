export function splitTextIntoLines(text: string): string[] {
  if (text === "") {
    return [""];
  }
  return text.split("\n");
}

export function measureText(text: string, font: string, canvas?: HTMLCanvasElement): number {
  const measureCanvas = canvas || document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context) {
    return text.length * 8; // Fallback approximation
  }

  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}
