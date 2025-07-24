export function splitTextIntoLines(text: string): string[] {
  if (text === "") {
    return [""];
  }
  return text.split("\n");
}
