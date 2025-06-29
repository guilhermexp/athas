use tauri::menu::{MenuBuilder, SubmenuBuilder};

pub fn create_menu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<tauri::menu::Menu<R>, tauri::Error> {
    // File menu
    let file_menu = SubmenuBuilder::new(app, "File")
        .text("new_file", "New File")
        .text("open_folder", "Open Folder")
        .separator()
        .text("save", "Save")
        .text("save_as", "Save As...")
        .separator()
        .text("close_tab", "Close Tab")
        .separator()
        .text("quit", "Quit")
        .build()?;

    // Edit menu
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .text("undo", "Undo")
        .text("redo", "Redo")
        .separator()
        .copy()
        .cut()
        .paste()
        .select_all()
        .separator()
        .text("find", "Find")
        .text("find_replace", "Find and Replace")
        .separator()
        .text("command_palette", "Command Palette")
        .build()?;

    // Theme submenu
    let theme_menu = SubmenuBuilder::new(app, "Theme")
        .text("theme_auto", "Auto")
        .separator()
        .text("theme_light", "Light")
        .text("theme_dark", "Dark")
        .text("theme_midnight", "Midnight")
        .separator()
        .text("theme_catppuccin_mocha", "Catppuccin Mocha")
        .text("theme_tokyo_night", "Tokyo Night")
        .text("theme_dracula", "Dracula")
        .text("theme_nord", "Nord")
        .build()?;

    // View menu
    let view_menu = SubmenuBuilder::new(app, "View")
        .text("toggle_sidebar", "Toggle Sidebar")
        .text("toggle_terminal", "Toggle Terminal")
        .text("toggle_ai_chat", "Toggle AI Chat")
        .separator()
        .text("split_editor", "Split Editor")
        .separator()
        .text("toggle_vim", "Toggle Vim Mode")
        .separator()
        .item(&theme_menu)
        .build()?;

    // Go menu
    let go_menu = SubmenuBuilder::new(app, "Go")
        .text("go_to_file", "Go to File")
        .text("go_to_line", "Go to Line")
        .separator()
        .text("next_tab", "Next Tab")
        .text("prev_tab", "Previous Tab")
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .text("help", "Help")
        .separator()
        .text("about", "About Athas")
        .build()?;

    // Main menu
    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &go_menu, &help_menu])
        .build()
}
