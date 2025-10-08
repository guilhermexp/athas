# Configuration UI - Agent Panel

## Visão Geral

O Zed fornece uma UI completa para configurar agents, LLM providers, MCP servers e ferramentas. Este documento detalha toda a estrutura da UI de configuração.

---

## AgentConfiguration Component

### Estrutura

```rust
pub struct AgentConfiguration {
    fs: Arc<dyn Fs>,
    language_registry: Arc<LanguageRegistry>,
    agent_server_store: Entity<AgentServerStore>,
    workspace: WeakEntity<Workspace>,
    focus_handle: FocusHandle,

    // UI State
    configuration_views_by_provider: HashMap<LanguageModelProviderId, AnyView>,
    expanded_provider_configurations: HashMap<LanguageModelProviderId, bool>,
    expanded_context_server_tools: HashMap<ContextServerId, bool>,

    // Stores
    context_server_store: Entity<ContextServerStore>,
    tools: Entity<ToolWorkingSet>,

    // Subscriptions
    _registry_subscription: Subscription,
    scroll_handle: ScrollHandle,
}
```

### Layout

```
┌────────────────────────────────────────────────────────┐
│                Agent Configuration                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         General Settings                        │  │
│  │  ☑ Allow running commands without asking       │  │
│  │  ☑ Enable single-file agent reviews            │  │
│  │  ☑ Play sound when finished generating         │  │
│  │  ☑ Use modifier to submit a message            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         External Agents                         │  │
│  │                                        [+ Add]   │  │
│  │  ────────────────────────────────────────────   │  │
│  │  🤖 Claude Code                            ✓    │  │
│  │  ────────────────────────────────────────────   │  │
│  │  🔮 Gemini CLI                             ✓    │  │
│  │  ────────────────────────────────────────────   │  │
│  │  ⚡ Your Custom Agent                       ✓    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Model Context Protocol (MCP) Servers           │  │
│  │                                        [+ Add]   │  │
│  │  ────────────────────────────────────────────   │  │
│  │  ● filesystem          [⚙️] [toggle]           │  │
│  │     5 tools                                     │  │
│  │  ────────────────────────────────────────────   │  │
│  │  ● github              [⚙️] [toggle]           │  │
│  │     8 tools                                     │  │
│  │  ────────────────────────────────────────────   │  │
│  │  🔴 postgres           [⚙️] [toggle]           │  │
│  │     Error: Connection failed                    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         LLM Providers                           │  │
│  │                                   [+ Add Provider]│  │
│  │  ────────────────────────────────────────────   │  │
│  │  🤖 Anthropic                     ▼             │  │
│  │     API Key: ****************************       │  │
│  │     [Start New Thread]                          │  │
│  │  ────────────────────────────────────────────   │  │
│  │  🔮 OpenAI                        ▼             │  │
│  │     API Key: ****************************       │  │
│  │     [Start New Thread]                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## Seções da UI

### 1. General Settings

**Opções:**

```rust
fn render_general_settings_section(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
    v_flex()
        .child(Headline::new("General Settings"))
        .child(self.render_command_permission(cx))
        .child(self.render_single_file_review(cx))
        .child(self.render_sound_notification(cx))
        .child(self.render_modifier_to_send(cx))
}
```

**1.1 Command Permission**
```rust
SwitchField::new(
    "always-allow-tool-actions-switch",
    "Allow running commands without asking for confirmation",
    Some("The agent can perform potentially destructive actions...".into()),
    always_allow_tool_actions,
    |state, _window, cx| {
        update_settings_file(fs.clone(), cx, |settings, _| {
            settings.agent
                .get_or_insert_default()
                .set_always_allow_tool_actions(state == &ToggleState::Selected);
        });
    },
)
```

**1.2 Single File Review**
```rust
SwitchField::new(
    "single-file-review",
    "Enable single-file agent reviews",
    Some("Agent edits are also displayed in single-file editors...".into()),
    single_file_review,
    |state, _window, cx| {
        // Update settings
    },
)
```

**1.3 Sound Notification**
```rust
SwitchField::new(
    "sound-notification",
    "Play sound when finished generating",
    Some("Hear a notification sound when the agent is done...".into()),
    play_sound_when_agent_done,
    |state, _window, cx| {
        // Update settings
    },
)
```

**1.4 Modifier to Send**
```rust
SwitchField::new(
    "modifier-send",
    "Use modifier to submit a message",
    Some("Make a modifier (cmd-enter on macOS, ...) required...".into()),
    use_modifier_to_send,
    |state, _window, cx| {
        // Update settings
    },
)
```

---

### 2. External Agents (ACP)

Lista de agentes externos conectados via Agent Client Protocol.

**Render:**
```rust
fn render_agent_servers_section(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
    v_flex()
        .child(
            h_flex()
                .child(Headline::new("External Agents"))
                .child(
                    Button::new("add-agent", "Add Agent")
                        .on_click(|_, window, cx| {
                            open_new_agent_servers_entry_in_settings_editor(...);
                        })
                )
        )
        .child(self.render_agent_server(IconName::AiClaude, "Claude Code"))
        .child(Divider::horizontal())
        .child(self.render_agent_server(IconName::AiGemini, "Gemini CLI"))
        .child(Divider::horizontal())
        // User-defined agents
}
```

**Agent Item:**
```rust
fn render_agent_server(&self, icon: IconName, name: impl Into<SharedString>) -> impl IntoElement {
    h_flex()
        .gap_1p5()
        .child(Icon::new(icon).color(Color::Muted))
        .child(Label::new(name.into()))
        .child(
            Icon::new(IconName::Check)
                .color(Color::Success)
        )
}
```

**Add Agent:**

Abre `settings.json` e adiciona entry:
```json
{
  "agent_servers": {
    "custom": {
      "your_agent": {
        "path": "path_to_executable",
        "args": [],
        "env": {},
        "default_mode": null
      }
    }
  }
}
```

---

### 3. MCP Servers

Lista de MCP (Model Context Protocol) servers configurados.

**Render:**
```rust
fn render_context_servers_section(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let context_server_ids = self.context_server_store
        .read(cx)
        .server_ids(cx);

    v_flex()
        .child(
            h_flex()
                .child(Headline::new("Model Context Protocol (MCP) Servers"))
                .child(
                    PopoverMenu::new("add-server-popover")
                        .trigger(Button::new("add-server", "Add Server"))
                        .menu(|window, cx| {
                            ContextMenu::build(window, cx, |menu, _, _| {
                                menu.entry("Add Custom Server", None, |window, cx| {
                                    window.dispatch_action(AddContextServer.boxed_clone(), cx)
                                })
                                .entry("Install from Extensions", None, |window, cx| {
                                    window.dispatch_action(
                                        zed_actions::Extensions {
                                            category_filter: Some(ExtensionCategoryFilter::ContextServers),
                                            id: None,
                                        }.boxed_clone(),
                                        cx,
                                    )
                                })
                            })
                        })
                )
        )
        .child(
            v_flex()
                .children(
                    context_server_ids
                        .into_iter()
                        .map(|id| self.render_context_server(id, window, cx))
                )
        )
}
```

**MCP Server Item:**
```rust
fn render_context_server(&self, id: ContextServerId, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
    let status = self.context_server_store
        .read(cx)
        .status_for_server(&id)
        .unwrap_or(ContextServerStatus::Stopped);

    let is_running = matches!(status, ContextServerStatus::Running);

    let (status_indicator, tooltip) = match status {
        ContextServerStatus::Starting => (
            Icon::new(IconName::LoadCircle)
                .with_keyed_rotate_animation(...)
                .into_any_element(),
            "Server is starting."
        ),
        ContextServerStatus::Running => (
            Indicator::dot().color(Color::Success).into_any_element(),
            "Server is active."
        ),
        ContextServerStatus::Error(_) => (
            Indicator::dot().color(Color::Error).into_any_element(),
            "Server has an error."
        ),
        ContextServerStatus::Stopped => (
            Indicator::dot().color(Color::Muted).into_any_element(),
            "Server is stopped."
        ),
    };

    v_flex()
        .child(
            h_flex()
                .child(status_indicator.tooltip(Tooltip::text(tooltip)))
                .child(Label::new(id.0.clone()))
                .child(
                    // Settings menu
                    PopoverMenu::new("context-server-config-menu")
                        .trigger(IconButton::new("...", IconName::Settings))
                        .menu(|window, cx| {
                            ContextMenu::build(window, cx, |menu, _, _| {
                                menu.entry("Configure Server", None, |window, cx| {
                                    ConfigureContextServerModal::show_modal_for_existing_server(...);
                                })
                                .entry("View Tools", None, |window, cx| {
                                    ConfigureContextServerToolsModal::toggle(...);
                                })
                                .separator()
                                .entry("Uninstall", None, |_, cx| {
                                    // Remove from settings
                                })
                            })
                        })
                )
                .child(
                    // Toggle switch
                    Switch::new("context-server-switch", is_running.into())
                        .on_click(|state, _, cx| {
                            match state {
                                ToggleState::Selected => {
                                    context_server_manager.update(cx, |store, cx| {
                                        store.start_server(server, cx);
                                    });
                                }
                                _ => {
                                    context_server_manager.update(cx, |store, cx| {
                                        store.stop_server(&id, cx).log_err();
                                    });
                                }
                            }

                            // Save to settings
                            update_settings_file(fs.clone(), cx, |settings, _| {
                                settings.project.context_servers
                                    .entry(id.0)
                                    .or_insert_with(...)
                                    .set_enabled(is_enabled);
                            });
                        })
                )
        )
        .when(is_running, |this| {
            this.child(
                Label::new(format!("{} tools", tool_count))
                    .color(Color::Muted)
            )
        })
}
```

---

### 4. LLM Providers

Lista de provedores de LLM configurados (Anthropic, OpenAI, Google, etc).

**Render:**
```rust
fn render_provider_configuration_section(&mut self, cx: &mut Context<Self>) -> impl IntoElement {
    let providers = LanguageModelRegistry::read_global(cx).providers();

    v_flex()
        .child(
            h_flex()
                .child(Headline::new("LLM Providers"))
                .child(
                    PopoverMenu::new("add-provider-popover")
                        .trigger(Button::new("add-provider", "Add Provider"))
                        .menu(|window, cx| {
                            ContextMenu::build(window, cx, |menu, _, _| {
                                menu.header("Compatible APIs")
                                    .entry("OpenAI", None, |window, cx| {
                                        AddLlmProviderModal::toggle(
                                            LlmCompatibleProvider::OpenAi,
                                            workspace,
                                            window,
                                            cx,
                                        );
                                    })
                            })
                        })
                )
        )
        .children(
            providers.into_iter().map(|provider| {
                self.render_provider_configuration_block(&provider, cx)
            })
        )
}
```

**Provider Block:**
```rust
fn render_provider_configuration_block(&mut self, provider: &Arc<dyn LanguageModelProvider>, cx: &mut Context<Self>) -> impl IntoElement {
    let is_expanded = self.expanded_provider_configurations
        .get(&provider.id())
        .copied()
        .unwrap_or(false);

    v_flex()
        .child(
            h_flex()
                .child(Icon::new(provider.icon()).color(Color::Muted))
                .child(Label::new(provider.name().0))
                .when(provider.is_authenticated(cx) && !is_expanded, |this| {
                    this.child(Icon::new(IconName::Check).color(Color::Success))
                })
                .child(
                    Disclosure::new(provider_id_string, is_expanded)
                        .opened_icon(IconName::ChevronUp)
                        .closed_icon(IconName::ChevronDown)
                )
                .on_click(cx.listener(|this, _, _, _| {
                    let is_expanded = this.expanded_provider_configurations
                        .entry(provider.id())
                        .or_insert(false);
                    *is_expanded = !*is_expanded;
                }))
        )
        .when(is_expanded, |this| {
            this.child(configuration_view)
                .when(provider.is_authenticated(cx), |this| {
                    this.child(
                        Button::new("new-thread", "Start New Thread")
                            .on_click(cx.listener(|_, _, _, cx| {
                                cx.emit(AssistantConfigurationEvent::NewThread(provider.clone()))
                            }))
                    )
                })
        })
}
```

---

## Modals

### ConfigureContextServerModal

Modal para adicionar/editar MCP server.

**UI:**
```
┌────────────────────────────────────────────┐
│  Configure MCP Server              [ X ]   │
├────────────────────────────────────────────┤
│                                            │
│  {                                         │
│    "my-server": {                          │
│      "command": "/path/to/server",         │
│      "args": ["--port", "8080"],           │
│      "env": {}                             │
│    }                                       │
│  }                                         │
│                                            │
├────────────────────────────────────────────┤
│           [Cancel]  [Save & Start]         │
└────────────────────────────────────────────┘
```

**Implementação:**
```rust
pub struct ConfigureContextServerModal {
    context_server_store: Entity<ContextServerStore>,
    workspace: WeakEntity<Workspace>,
    source: ConfigurationSource,
    state: State,
    original_server_id: Option<ContextServerId>,
}

enum ConfigurationSource {
    New {
        editor: Entity<Editor>,  // JSON editor
    },
    Existing {
        editor: Entity<Editor>,
    },
    Extension {
        id: ContextServerId,
        editor: Option<Entity<Editor>>,
        repository_url: Option<SharedString>,
        installation_instructions: Option<Entity<Markdown>>,
        settings_validator: Option<jsonschema::Validator>,
    },
}
```

**Confirm:**
```rust
fn confirm(&mut self, _: &menu::Confirm, cx: &mut Context<Self>) {
    let (id, settings) = self.source.output(cx)?;

    // Stop existing server if running
    if let Some(existing) = self.context_server_store.read(cx).get_running_server(&id) {
        self.context_server_store.update(cx, |store, cx| {
            store.stop_server(&id, cx).log_err();
        });
    }

    // Save to settings
    let fs = workspace.read(cx).app_state().fs.clone();
    update_settings_file(fs, cx, |settings, _| {
        settings.project.context_servers.insert(id.0.clone(), settings);
    });

    // Start server
    let configuration = ContextServerConfiguration::from_settings(...).await?;
    let server = Arc::new(ContextServer::stdio(id, configuration.command(), root_path));

    self.context_server_store.update(cx, |store, cx| {
        store.start_server(server, cx);
    });

    // Close modal
    cx.emit(DismissEvent);
}
```

---

### ConfigureContextServerToolsModal

Modal para visualizar tools de um MCP server.

**UI:**
```
┌────────────────────────────────────────────┐
│  filesystem Tools                  [ X ]   │
├────────────────────────────────────────────┤
│                                            │
│  ✓ read_file                               │
│    Read the contents of a file             │
│                                            │
│  ✓ write_file                              │
│    Write content to a file                 │
│                                            │
│  ✓ list_directory                          │
│    List all files in a directory           │
│                                            │
│  ✓ search_files                            │
│    Search for files by pattern             │
│                                            │
│  ✓ get_file_info                           │
│    Get metadata about a file               │
│                                            │
├────────────────────────────────────────────┤
│                      [Close]               │
└────────────────────────────────────────────┘
```

---

## Settings Integration

### Update Settings

```rust
use settings::{update_settings_file, Settings};

fn update_agent_setting<F>(fs: Arc<dyn Fs>, cx: &mut App, f: F)
where
    F: FnOnce(&mut settings::AllSettingsContent, &App) + 'static,
{
    update_settings_file(fs, cx, f);
}
```

**Exemplos:**

```rust
// 1. Toggle allow tool actions
update_settings_file(fs.clone(), cx, |settings, _| {
    settings.agent
        .get_or_insert_default()
        .set_always_allow_tool_actions(true);
});

// 2. Add MCP server
update_settings_file(fs.clone(), cx, |settings, _| {
    settings.project.context_servers.insert(
        "my-server".into(),
        ContextServerSettings::Custom {
            enabled: true,
            command: ContextServerCommand {
                path: "/path/to/server".into(),
                args: vec![],
                env: None,
                timeout: None,
            },
        },
    );
});

// 3. Enable MCP server
update_settings_file(fs.clone(), cx, |settings, _| {
    settings.project.context_servers
        .entry("filesystem".into())
        .or_insert_with(|| ContextServerSettings::default_extension())
        .set_enabled(true);
});

// 4. Remove MCP server
update_settings_file(fs.clone(), cx, |settings, _| {
    settings.project.context_servers.remove("my-server");
});
```

---

## Events

### AssistantConfigurationEvent

```rust
pub enum AssistantConfigurationEvent {
    NewThread(Arc<dyn LanguageModelProvider>),
}

impl EventEmitter<AssistantConfigurationEvent> for AgentConfiguration {}
```

**Uso:**
```rust
// Em AgentPanel
cx.subscribe(&configuration, |this, _, event, window, cx| {
    match event {
        AssistantConfigurationEvent::NewThread(provider) => {
            this.new_thread_with_provider(provider, window, cx);
        }
    }
})
```

---

## Keyboard Shortcuts

```rust
impl AgentConfiguration {
    fn register_actions(&mut self, cx: &mut Context<Self>) {
        // Cmd+N: New server
        cx.on_action(|this: &mut Self, _: &AddContextServer, window, cx| {
            ConfigureContextServerModal::show_modal(
                ConfigurationTarget::New,
                this.language_registry.clone(),
                this.workspace.clone(),
                cx,
            ).detach();
        });

        // Cmd+R: Restart server
        cx.on_action(|this: &mut Self, action: &Restart, window, cx| {
            if let Some(server_id) = this.selected_server_id() {
                this.context_server_store.update(cx, |store, cx| {
                    store.restart_server(&server_id, cx).log_err();
                });
            }
        });
    }
}
```

---

## Best Practices

### 1. Reactive Updates

```rust
// Observe settings changes
cx.observe_global::<SettingsStore>(|this, cx| {
    let new_settings = AgentSettings::get_global(cx);
    if this.settings != new_settings {
        this.settings = new_settings;
        cx.notify();
    }
})
```

### 2. Error Handling

```rust
// Show toast on error
fn show_error(&self, workspace: &Workspace, error: impl Into<SharedString>, cx: &mut App) {
    let toast = StatusToast::new(
        error.into(),
        cx,
        |this, cx| {
            this.icon(ToastIcon::new(IconName::Warning).color(Color::Warning))
                .dismiss_button(true)
        },
    );
    workspace.toggle_status_toast(toast, cx);
}
```

### 3. Async Operations

```rust
// Long operations in background
cx.spawn(async move |this, cx| {
    let result = some_long_operation().await?;

    this.update(cx, |this, cx| {
        this.apply_result(result, cx);
    })?
}).detach_and_log_err(cx);
```

### 4. Validation

```rust
// Validate before save
fn validate_server_config(&self, config: &str) -> Result<ContextServerCommand> {
    let parsed: serde_json::Value = serde_json::from_str(config)?;

    // Validate structure
    let command = parsed.get("command")
        .context("Missing command field")?
        .as_str()
        .context("Command must be string")?;

    // Validate path exists
    if !Path::new(command).exists() {
        bail!("Command not found: {}", command);
    }

    Ok(ContextServerCommand {
        path: command.into(),
        args: vec![],
        env: None,
        timeout: None,
    })
}
```

---

## Referências

- Zed UI Framework (GPUI): https://zed.dev/docs/extensions/gpui
- Settings System: `crates/settings/`
- Agent Configuration: `crates/agent_ui/src/agent_configuration.rs`
