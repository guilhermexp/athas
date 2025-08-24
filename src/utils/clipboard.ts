/**
 * Clipboard utilities for copying text to clipboard
 */

/**
 * Copies text to the clipboard using the modern Clipboard API with fallback
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves when text is copied
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    // Try modern Clipboard API first
    await navigator.clipboard.writeText(text);
  } catch (_err) {
    // Fallback for older browsers or when Clipboard API is not available
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
      console.warn("Failed to copy text using fallback method:", err);
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Checks if the Clipboard API is available in the current environment
 * @returns boolean indicating if Clipboard API is supported
 */
export const isClipboardSupported = (): boolean => {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  );
};

/**
 * Copies text to clipboard and returns success status
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to boolean indicating success
 */
export const copyToClipboardWithStatus = async (text: string): Promise<boolean> => {
  try {
    await copyToClipboard(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

/**
 * Reads text from clipboard (requires user permission in most browsers)
 * @returns Promise that resolves to the clipboard text
 */
export const readFromClipboard = async (): Promise<string> => {
  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    console.error("Failed to read from clipboard:", error);
    throw new Error("Failed to read from clipboard");
  }
};
