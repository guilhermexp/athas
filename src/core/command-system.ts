export interface EditorAPI {
  getContent(): string;
  setContent(content: string): void;
  getSelection(): { start: number; end: number } | null;
  setSelection(start: number, end: number): void;
  getCursorPosition(): number;
  setCursorPosition(position: number): void;
  insert(text: string, position?: number): void;
  delete(start: number, end: number): void;
  replace(start: number, end: number, text: string): void;
}

export interface CommandContext {
  editor: EditorAPI;
  event?: KeyboardEvent | InputEvent;
  preventDefault: () => void;
}

export interface Command {
  id: string;
  execute: (ctx: CommandContext) => undefined | boolean;
}

export class CommandSystem {
  private commands = new Map<string, Command>();
  private keyBindings = new Map<string, string>();

  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
  }

  executeCommand(id: string, ctx: CommandContext): boolean {
    const command = this.commands.get(id);
    if (!command) {
      return false;
    }

    const result = command.execute(ctx);
    return result !== false;
  }

  bindKey(key: string, commandId: string): void {
    this.keyBindings.set(key, commandId);
  }

  unbindKey(key: string): void {
    this.keyBindings.delete(key);
  }

  handleKeyEvent(event: KeyboardEvent, editor: EditorAPI): boolean {
    const key = this.getKeyString(event);
    const commandId = this.keyBindings.get(key);

    if (!commandId) {
      return false;
    }

    let defaultPrevented = false;
    const ctx: CommandContext = {
      editor,
      event,
      preventDefault: () => {
        defaultPrevented = true;
        event.preventDefault();
      },
    };

    const executed = this.executeCommand(commandId, ctx);
    if (executed && defaultPrevented) {
      return true;
    }

    return false;
  }

  private getKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push("Cmd");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    parts.push(key);

    return parts.join("+");
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  getKeyBindings(): Map<string, string> {
    return new Map(this.keyBindings);
  }
}
