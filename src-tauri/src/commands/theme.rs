use std::process::Command;

fn get_system_theme_sync() -> String {
   #[cfg(target_os = "linux")]
   {
      // Try GNOME color-scheme first (most reliable on modern systems)
      if let Ok(output) = Command::new("gsettings")
         .args(&["get", "org.gnome.desktop.interface", "color-scheme"])
         .output()
      {
         if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let theme = stdout.trim().replace('\'', "").replace('\"', "");
            match theme.as_str() {
               "prefer-dark" => return "dark".to_string(),
               "prefer-light" => return "light".to_string(),
               _ => {} // Continue to fallback
            }
         }
      }

      // Fallback to gtk-theme
      if let Ok(output) = Command::new("gsettings")
         .args(&["get", "org.gnome.desktop.interface", "gtk-theme"])
         .output()
      {
         if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if stdout.contains("dark") || stdout.contains("adwaita-dark") {
               return "dark".to_string();
            }
         }
      }

      // Check for KDE Plasma theme
      if let Ok(output) = Command::new("kreadconfig5")
         .args(&[
            "--file",
            "kdeglobals",
            "--group",
            "General",
            "--key",
            "ColorScheme",
         ])
         .output()
      {
         if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if stdout.contains("dark") || stdout.contains("breeze dark") {
               return "dark".to_string();
            }
         }
      }

      // Default fallback - assume light theme
      "light".to_string()
   }

   #[cfg(target_os = "macos")]
   {
      // For macOS, try to detect dark mode
      if let Ok(output) = Command::new("defaults")
         .args(["read", "-g", "AppleInterfaceStyle"])
         .output()
      {
         if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.trim().eq_ignore_ascii_case("dark") {
               return "dark".to_string();
            }
         }
      }
      "light".to_string()
   }

   #[cfg(target_os = "windows")]
   {
      // For Windows, check registry for dark theme
      if let Ok(output) = Command::new("reg")
         .args(&[
            "query",
            "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "/v",
            "AppsUseLightTheme",
         ])
         .output()
      {
         if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("0x0") {
               return "dark".to_string();
            }
         }
      }
      "light".to_string()
   }

   #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
   {
      "light".to_string()
   }
}

#[tauri::command]
pub async fn get_system_theme() -> Result<String, String> {
   Ok(get_system_theme_sync())
}
