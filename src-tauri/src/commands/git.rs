use anyhow::{Context, Result, bail};
use base64::{Engine as _, engine::general_purpose};
use git2::{BranchType, Diff, Oid, Repository, Sort};
use std::io::Write;
use std::path::Path;
use std::process::Command;
use tauri::command;
use tempfile::NamedTempFile;

// Convert anyhow::Result to Result<T, String> for Tauri
trait IntoStringError<T> {
    fn into_string_error(self) -> Result<T, String>;
}

impl<T> IntoStringError<T> for Result<T> {
    fn into_string_error(self) -> Result<T, String> {
        self.map_err(|e| format!("{:#}", e))
    }
}

#[derive(serde::Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub files: Vec<GitFile>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
}

#[derive(serde::Serialize)]
pub struct GitFile {
    pub path: String,
    pub status: FileStatus,
    pub staged: bool,
}

#[derive(serde::Serialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum DiffLineType {
    Added,
    Removed,
    Context,
    Header,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct GitDiffLine {
    pub line_type: DiffLineType,
    pub content: String,
    pub old_line_number: Option<u32>,
    pub new_line_number: Option<u32>,
}

#[derive(serde::Serialize)]
pub struct GitDiff {
    pub file_path: String,
    pub old_path: Option<String>,
    pub new_path: Option<String>,
    pub is_new: bool,
    pub is_deleted: bool,
    pub is_renamed: bool,
    pub is_binary: bool,
    pub is_image: bool,
    pub old_blob_base64: Option<String>,
    pub new_blob_base64: Option<String>,
    pub lines: Vec<GitDiffLine>,
}

#[derive(serde::Serialize)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
}

#[derive(serde::Serialize)]
pub struct GitStash {
    pub index: usize,
    pub message: String,
    pub date: String,
}

#[derive(serde::Serialize)]
pub struct GitTag {
    pub name: String,
    pub commit: String,
    pub message: Option<String>,
    pub date: String,
}

fn is_image_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".png")
        || lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".gif")
        || lower.ends_with(".bmp")
        || lower.ends_with(".svg")
        || lower.ends_with(".webp")
        || lower.ends_with(".ico")
        || lower.ends_with(".tiff")
        || lower.ends_with(".tif")
        || lower.ends_with(".avif")
        || lower.ends_with(".heic")
        || lower.ends_with(".heif")
        || lower.ends_with(".jfif")
        || lower.ends_with(".pjpeg")
        || lower.ends_with(".pjp")
        || lower.ends_with(".apng")
}

fn get_blob_base64(repo: &Repository, oid: Option<Oid>, _file_path: &str) -> Option<String> {
    if let Some(oid) = oid {
        if !oid.is_zero() {
            if let Ok(blob) = repo.find_blob(oid) {
                let data = blob.content();
                return Some(general_purpose::STANDARD.encode(data));
            }
        }
    }
    None
}

fn parse_diff_to_lines(diff: &mut Diff) -> Result<Vec<GitDiffLine>, String> {
    use git2::DiffFormat;

    let mut lines: Vec<GitDiffLine> = Vec::new();

    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        match origin {
            'F' | 'H' => {
                let content = String::from_utf8_lossy(line.content()).to_string();
                lines.push(GitDiffLine {
                    line_type: DiffLineType::Header,
                    content,
                    old_line_number: None,
                    new_line_number: None,
                });
            }
            '+' => {
                lines.push(GitDiffLine {
                    line_type: DiffLineType::Added,
                    content: String::from_utf8_lossy(line.content())
                        .trim_end_matches('\n')
                        .to_string(),
                    old_line_number: None,
                    new_line_number: line.new_lineno(),
                });
            }
            '-' => {
                lines.push(GitDiffLine {
                    line_type: DiffLineType::Removed,
                    content: String::from_utf8_lossy(line.content())
                        .trim_end_matches('\n')
                        .to_string(),
                    old_line_number: line.old_lineno(),
                    new_line_number: None,
                });
            }
            ' ' => {
                lines.push(GitDiffLine {
                    line_type: DiffLineType::Context,
                    content: String::from_utf8_lossy(line.content())
                        .trim_end_matches('\n')
                        .to_string(),
                    old_line_number: line.old_lineno(),
                    new_line_number: line.new_lineno(),
                });
            }
            _ => {}
        }
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(lines)
}

fn get_ahead_behind_counts(repo: &Repository, branch: &str) -> (i32, i32) {
    let local_branch = match repo.find_branch(branch, git2::BranchType::Local) {
        Ok(branch) => branch,
        Err(_) => return (0, 0),
    };

    let upstream = match local_branch.upstream() {
        Ok(upstream) => upstream,
        Err(_) => return (0, 0),
    };

    let local_oid = match local_branch.get().target() {
        Some(oid) => oid,
        None => return (0, 0),
    };

    let upstream_oid = match upstream.get().target() {
        Some(oid) => oid,
        None => return (0, 0),
    };

    match repo.graph_ahead_behind(local_oid, upstream_oid) {
        Ok((ahead, behind)) => (ahead as i32, behind as i32),
        Err(_) => (0, 0),
    }
}

#[command]
pub fn git_status(repo_path: String) -> Result<GitStatus, String> {
    _git_status(repo_path).into_string_error()
}

fn _git_status(repo_path: String) -> Result<GitStatus> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let branch = repo
        .head()
        .ok()
        .and_then(|head| {
            if head.is_branch() {
                head.shorthand().map(|s| s.to_string())
            } else {
                Some("HEAD".to_string())
            }
        })
        .unwrap_or_else(|| "unknown".to_string());

    let (ahead, behind) = get_ahead_behind_counts(&repo, &branch);

    let mut status_opts = git2::StatusOptions::new();
    status_opts
        .include_untracked(true)
        .include_ignored(false)
        .include_unmodified(false);

    let statuses = repo
        .statuses(Some(&mut status_opts))
        .context("Failed to get status")?;

    let mut files = Vec::new();
    for entry in statuses.iter() {
        let status_flags = entry.status();

        if status_flags == git2::Status::CURRENT {
            continue;
        }

        let path = entry.path().context("Invalid path")?.to_string();

        // Check for staged changes
        let has_staged = status_flags.intersects(
            git2::Status::INDEX_NEW
                | git2::Status::INDEX_MODIFIED
                | git2::Status::INDEX_DELETED
                | git2::Status::INDEX_RENAMED
                | git2::Status::INDEX_TYPECHANGE,
        );

        // Check for unstaged changes
        let has_unstaged = status_flags.intersects(
            git2::Status::WT_NEW
                | git2::Status::WT_MODIFIED
                | git2::Status::WT_DELETED
                | git2::Status::WT_RENAMED
                | git2::Status::WT_TYPECHANGE,
        );

        // Add staged entry if there are staged changes
        if has_staged {
            let status = if status_flags.contains(git2::Status::INDEX_NEW) {
                FileStatus::Added
            } else if status_flags.contains(git2::Status::INDEX_DELETED) {
                FileStatus::Deleted
            } else if status_flags.contains(git2::Status::INDEX_RENAMED) {
                FileStatus::Renamed
            } else {
                FileStatus::Modified
            };

            files.push(GitFile {
                path: path.clone(),
                status,
                staged: true,
            });
        }

        // Add unstaged entry if there are unstaged changes
        if has_unstaged {
            let status = if status_flags.contains(git2::Status::WT_NEW) && !has_staged {
                FileStatus::Untracked
            } else if status_flags.contains(git2::Status::WT_DELETED) {
                FileStatus::Deleted
            } else if status_flags.contains(git2::Status::WT_RENAMED) {
                FileStatus::Renamed
            } else if status_flags.contains(git2::Status::WT_NEW) {
                FileStatus::Added
            } else {
                FileStatus::Modified
            };

            files.push(GitFile {
                path,
                status,
                staged: false,
            });
        }
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        files,
    })
}

#[command]
pub fn git_add(repo_path: String, file_path: String) -> Result<(), String> {
    _git_add(repo_path, file_path).into_string_error()
}

fn _git_add(repo_path: String, file_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let mut index = repo.index().context("Failed to get index")?;

    index
        .add_path(Path::new(&file_path))
        .context("Failed to add file")?;
    index.write().context("Failed to write index")?;

    Ok(())
}

#[command]
pub fn git_reset(repo_path: String, file_path: String) -> Result<(), String> {
    _git_reset(repo_path, file_path).into_string_error()
}

fn _git_reset(repo_path: String, file_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let head = repo.head().context("Failed to get HEAD")?;
    let head_commit = head.peel_to_commit().context("Failed to get HEAD commit")?;
    let head_tree = head_commit.tree().context("Failed to get HEAD tree")?;
    let mut index = repo.index().context("Failed to get index")?;

    let path = Path::new(&file_path);
    match head_tree.get_path(path) {
        Ok(entry) => {
            let object = entry.to_object(&repo).context("Failed to get object")?;
            let blob = object.as_blob().context("Object is not a blob")?;

            let index_entry = git2::IndexEntry {
                ctime: git2::IndexTime::new(0, 0),
                mtime: git2::IndexTime::new(0, 0),
                dev: 0,
                ino: 0,
                mode: entry.filemode() as u32,
                uid: 0,
                gid: 0,
                file_size: blob.size() as u32,
                id: entry.id(),
                flags: 0,
                flags_extended: 0,
                path: file_path.as_bytes().to_vec(),
            };

            index.add(&index_entry).context("Failed to update index")?;
        }
        Err(_) => {
            index
                .remove_path(path)
                .context("Failed to remove from index")?;
        }
    }

    index.write().context("Failed to write index")?;
    Ok(())
}

#[command]
pub fn git_commit(repo_path: String, message: String) -> Result<(), String> {
    _git_commit(repo_path, message).into_string_error()
}

fn _git_commit(repo_path: String, message: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let mut index = repo.index().context("Failed to get index")?;

    let tree_id = index.write_tree().context("Failed to write tree")?;
    let tree = repo.find_tree(tree_id).context("Failed to find tree")?;
    let sig = repo.signature().context("Failed to get signature")?;
    let head = repo.head().context("Failed to get HEAD")?;
    let parent_commit = head
        .peel_to_commit()
        .context("Failed to get parent commit")?;

    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&parent_commit])
        .context("Failed to create commit")?;

    Ok(())
}

#[command]
pub fn git_add_all(repo_path: String) -> Result<(), String> {
    _git_add_all(repo_path).into_string_error()
}

fn _git_add_all(repo_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let mut index = repo.index().context("Failed to get index")?;

    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .context("Failed to add all files")?;
    index.write().context("Failed to write index")?;

    Ok(())
}

#[command]
pub fn git_reset_all(repo_path: String) -> Result<(), String> {
    _git_reset_all(repo_path).into_string_error()
}

fn _git_reset_all(repo_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let head = repo.head().context("Failed to get HEAD")?;
    let head_commit = head.peel_to_commit().context("Failed to get HEAD commit")?;
    let head_tree = head_commit.tree().context("Failed to get HEAD tree")?;
    let mut index = repo.index().context("Failed to get index")?;

    index
        .read_tree(&head_tree)
        .context("Failed to reset index to HEAD")?;
    index.write().context("Failed to write index")?;

    Ok(())
}

#[command]
pub fn git_log(repo_path: String, limit: Option<u32>) -> Result<Vec<GitCommit>, String> {
    _git_log(repo_path, limit).into_string_error()
}

fn _git_log(repo_path: String, limit: Option<u32>) -> Result<Vec<GitCommit>> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let mut revwalk = repo.revwalk().context("Failed to create revwalk")?;

    revwalk.push_head().context("Failed to push HEAD")?;
    revwalk
        .set_sorting(Sort::TIME)
        .context("Failed to set sorting")?;

    let limit = limit.unwrap_or(10) as usize;
    let mut commits = Vec::new();

    for (idx, oid) in revwalk.enumerate() {
        if idx >= limit {
            break;
        }

        let oid = oid.context("Failed to get commit oid")?;
        let commit = repo.find_commit(oid).context("Failed to find commit")?;

        let author = commit.author();
        let time = chrono::DateTime::<chrono::Utc>::from_timestamp(author.when().seconds(), 0)
            .map(|dt| dt.format("%Y-%m-%d").to_string())
            .unwrap_or_default();

        commits.push(GitCommit {
            hash: oid.to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            author: author.name().unwrap_or("Unknown").to_string(),
            date: time,
        });
    }

    Ok(commits)
}

#[command]
pub fn git_diff_file(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<GitDiff, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {e}"))?;
    let is_image = is_image_file(&file_path);

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {e}"))?;
    let head_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to peel to commit: {e}"))?;
    let head_tree = head_commit
        .tree()
        .map_err(|e| format!("Failed to get HEAD tree: {e}"))?;

    let mut diff_opts = git2::DiffOptions::new();
    diff_opts.pathspec(&file_path);

    let diff_result = if staged {
        let index = repo
            .index()
            .map_err(|e| format!("Failed to get index: {e}"))?;
        repo.diff_tree_to_index(Some(&head_tree), Some(&index), Some(&mut diff_opts))
    } else {
        // For unstaged changes, compare index to working directory
        let index = repo
            .index()
            .map_err(|e| format!("Failed to get index: {e}"))?;
        repo.diff_index_to_workdir(Some(&index), Some(&mut diff_opts))
    };

    let mut diff = diff_result.map_err(|e| format!("Failed to create diff: {e}"))?;

    let mut old_blob_base64 = None;
    let mut new_blob_base64 = None;
    let mut lines = Vec::new();

    let deltas: Vec<_> = diff.deltas().collect();

    if deltas.is_empty() {
        let mut broader_diff_opts = git2::DiffOptions::new();
        let broader_diff_result = if staged {
            let index = repo
                .index()
                .map_err(|e| format!("Failed to get index: {e}"))?;
            repo.diff_tree_to_index(Some(&head_tree), Some(&index), Some(&mut broader_diff_opts))
        } else {
            // For unstaged changes, compare index to working directory
            let index = repo
                .index()
                .map_err(|e| format!("Failed to get index: {e}"))?;
            repo.diff_index_to_workdir(Some(&index), Some(&mut broader_diff_opts))
        };

        if let Ok(broader_diff) = broader_diff_result {
            let all_deltas: Vec<_> = broader_diff.deltas().collect();

            for delta in all_deltas {
                let delta_old_path = delta
                    .old_file()
                    .path()
                    .map(|p| p.to_string_lossy().into_owned());
                let delta_new_path = delta
                    .new_file()
                    .path()
                    .map(|p| p.to_string_lossy().into_owned());

                if delta_old_path.as_deref() == Some(&file_path)
                    || delta_new_path.as_deref() == Some(&file_path)
                {
                    let is_new = delta.status() == git2::Delta::Added;
                    let is_deleted = delta.status() == git2::Delta::Deleted;
                    let is_renamed = delta.status() == git2::Delta::Renamed;

                    let old_path = delta_old_path;
                    let new_path = delta_new_path;

                    if is_image {
                        let old_oid = delta.old_file().id();
                        let new_oid = delta.new_file().id();

                        if is_deleted {
                            old_blob_base64 = get_blob_base64(
                                &repo,
                                Some(old_oid),
                                old_path.as_deref().unwrap_or(&file_path),
                            );
                        } else if is_renamed {
                            old_blob_base64 = get_blob_base64(
                                &repo,
                                Some(old_oid),
                                old_path.as_deref().unwrap_or(&file_path),
                            );
                            if staged {
                                new_blob_base64 = get_blob_base64(
                                    &repo,
                                    Some(new_oid),
                                    new_path.as_deref().unwrap_or(&file_path),
                                );
                            } else {
                                let abs_path = Path::new(&repo_path)
                                    .join(new_path.as_deref().unwrap_or(&file_path));
                                if let Ok(data) = std::fs::read(abs_path) {
                                    new_blob_base64 = Some(general_purpose::STANDARD.encode(data));
                                }
                            }
                        } else {
                            if !is_new {
                                old_blob_base64 = get_blob_base64(&repo, Some(old_oid), &file_path);
                            }
                            if staged {
                                new_blob_base64 = get_blob_base64(&repo, Some(new_oid), &file_path);
                            } else {
                                let abs_path = Path::new(&repo_path).join(&file_path);
                                if let Ok(data) = std::fs::read(abs_path) {
                                    new_blob_base64 = Some(general_purpose::STANDARD.encode(data));
                                }
                            }
                        }
                        lines = Vec::new();
                    } else {
                        let mut single_file_opts = git2::DiffOptions::new();
                        let target_path = if is_deleted {
                            old_path.as_deref().unwrap_or(&file_path)
                        } else {
                            new_path.as_deref().unwrap_or(&file_path)
                        };
                        single_file_opts.pathspec(target_path);

                        let single_diff_result = if staged {
                            let index = repo
                                .index()
                                .map_err(|e| format!("Failed to get index: {e}"))?;
                            repo.diff_tree_to_index(
                                Some(&head_tree),
                                Some(&index),
                                Some(&mut single_file_opts),
                            )
                        } else {
                            repo.diff_tree_to_workdir(Some(&head_tree), Some(&mut single_file_opts))
                        };

                        if let Ok(mut single_diff) = single_diff_result {
                            lines = parse_diff_to_lines(&mut single_diff).unwrap_or_default();
                        }
                    }

                    return Ok(GitDiff {
                        file_path: file_path.clone(),
                        old_path,
                        new_path,
                        is_new,
                        is_deleted,
                        is_renamed,
                        is_binary: is_image,
                        is_image,
                        old_blob_base64,
                        new_blob_base64,
                        lines,
                    });
                }
            }
        }

        return Err(format!(
            "No changes found for file: {file_path} (searched {file_path} paths)"
        ));
    }

    let delta = &deltas[0];

    let is_new = delta.status() == git2::Delta::Added;
    let is_deleted = delta.status() == git2::Delta::Deleted;
    let is_renamed = delta.status() == git2::Delta::Renamed;

    let old_path = delta
        .old_file()
        .path()
        .map(|p| p.to_string_lossy().into_owned());
    let new_path = delta
        .new_file()
        .path()
        .map(|p| p.to_string_lossy().into_owned());

    if is_image {
        let old_oid = delta.old_file().id();
        let new_oid = delta.new_file().id();

        if is_new {
            if staged {
                new_blob_base64 = get_blob_base64(&repo, Some(new_oid), &file_path);
            } else {
                let abs_path = Path::new(&repo_path).join(&file_path);
                if let Ok(data) = std::fs::read(abs_path) {
                    new_blob_base64 = Some(general_purpose::STANDARD.encode(data));
                }
            }
        } else if is_deleted {
            old_blob_base64 = get_blob_base64(
                &repo,
                Some(old_oid),
                old_path.as_deref().unwrap_or(&file_path),
            );
        } else if is_renamed {
            old_blob_base64 = get_blob_base64(
                &repo,
                Some(old_oid),
                old_path.as_deref().unwrap_or(&file_path),
            );
            if staged {
                new_blob_base64 = get_blob_base64(
                    &repo,
                    Some(new_oid),
                    new_path.as_deref().unwrap_or(&file_path),
                );
            } else {
                let abs_path =
                    Path::new(&repo_path).join(new_path.as_deref().unwrap_or(&file_path));
                if let Ok(data) = std::fs::read(abs_path) {
                    new_blob_base64 = Some(general_purpose::STANDARD.encode(data));
                }
            }
        } else {
            old_blob_base64 = get_blob_base64(&repo, Some(old_oid), &file_path);
            if staged {
                new_blob_base64 = get_blob_base64(&repo, Some(new_oid), &file_path);
            } else {
                let abs_path = Path::new(&repo_path).join(&file_path);
                if let Ok(data) = std::fs::read(abs_path) {
                    new_blob_base64 = Some(general_purpose::STANDARD.encode(data));
                }
            }
        }

        lines = Vec::new();
    } else {
        lines = parse_diff_to_lines(&mut diff)?;
    }

    Ok(GitDiff {
        file_path: file_path.clone(),
        old_path,
        new_path,
        is_new,
        is_deleted,
        is_renamed,
        is_binary: is_image,
        is_image,
        old_blob_base64,
        new_blob_base64,
        lines,
    })
}

#[command]
pub fn git_commit_diff(
    repo_path: String,
    commit_hash: String,
    file_path: Option<String>,
) -> Result<Vec<GitDiff>, String> {
    let repo =
        Repository::open(&repo_path).map_err(|e| format!("Failed to open repository: {e}"))?;
    let oid = Oid::from_str(&commit_hash).map_err(|e| format!("Invalid commit hash: {e}"))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| format!("Commit not found: {e}"))?;
    let commit_tree = commit
        .tree()
        .map_err(|e| format!("Failed to get commit tree: {e}"))?;
    let parent = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| format!("Failed to get parent commit: {e}"))?,
        )
    } else {
        None
    };
    let parent_tree = if let Some(p) = &parent {
        Some(
            p.tree()
                .map_err(|e| format!("Failed to get parent tree: {e}"))?,
        )
    } else {
        None
    };
    let mut diff_opts = git2::DiffOptions::new();
    if let Some(path) = &file_path {
        diff_opts.pathspec(path);
    }
    let diff = repo
        .diff_tree_to_tree(
            parent_tree.as_ref(),
            Some(&commit_tree),
            Some(&mut diff_opts),
        )
        .map_err(|e| format!("Failed to create commit diff: {e}"))?;
    let mut results: Vec<GitDiff> = Vec::new();
    for delta in diff.deltas() {
        let old_path = delta
            .old_file()
            .path()
            .map(|p| p.to_string_lossy().into_owned());
        let new_path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().into_owned());
        let file_path = if delta.status() == git2::Delta::Deleted {
            old_path.clone().unwrap_or_default()
        } else {
            new_path
                .clone()
                .unwrap_or_else(|| old_path.clone().unwrap_or_default())
        };
        let is_image = is_image_file(&file_path);
        let mut is_binary = false;
        let mut old_blob_base64 = None;
        let mut new_blob_base64 = None;
        let is_new = delta.status() == git2::Delta::Added;
        let is_deleted = delta.status() == git2::Delta::Deleted;
        let is_renamed = delta.status() == git2::Delta::Renamed;
        let lines = if is_image {
            is_binary = true;
            let old_oid = delta.old_file().id();
            let new_oid = delta.new_file().id();
            if is_new {
                new_blob_base64 =
                    get_blob_base64(&repo, Some(new_oid), new_path.as_deref().unwrap_or(""));
            } else if is_deleted {
                if let Some(parent_tree) = &parent_tree {
                    let old_blob_oid = old_path
                        .as_ref()
                        .and_then(|p| parent_tree.get_path(Path::new(p)).ok().map(|e| e.id()));
                    old_blob_base64 =
                        get_blob_base64(&repo, old_blob_oid, old_path.as_deref().unwrap_or(""));
                } else {
                    old_blob_base64 =
                        get_blob_base64(&repo, Some(old_oid), old_path.as_deref().unwrap_or(""));
                }
            } else if is_renamed {
                if let Some(parent_tree) = &parent_tree {
                    let old_blob_oid = old_path
                        .as_ref()
                        .and_then(|p| parent_tree.get_path(Path::new(p)).ok().map(|e| e.id()));
                    old_blob_base64 =
                        get_blob_base64(&repo, old_blob_oid, old_path.as_deref().unwrap_or(""));
                } else {
                    old_blob_base64 =
                        get_blob_base64(&repo, Some(old_oid), old_path.as_deref().unwrap_or(""));
                }
                new_blob_base64 =
                    get_blob_base64(&repo, Some(new_oid), new_path.as_deref().unwrap_or(""));
            } else {
                if let Some(parent_tree) = &parent_tree {
                    let old_blob_oid = old_path
                        .as_ref()
                        .and_then(|p| parent_tree.get_path(Path::new(p)).ok().map(|e| e.id()));
                    old_blob_base64 =
                        get_blob_base64(&repo, old_blob_oid, old_path.as_deref().unwrap_or(""));
                } else {
                    old_blob_base64 =
                        get_blob_base64(&repo, Some(old_oid), old_path.as_deref().unwrap_or(""));
                }
                new_blob_base64 =
                    get_blob_base64(&repo, Some(new_oid), new_path.as_deref().unwrap_or(""));
            }
            Vec::new()
        } else {
            let mut single_file_opts = git2::DiffOptions::new();
            single_file_opts.pathspec(&file_path);
            let mut single_file_diff = repo
                .diff_tree_to_tree(
                    parent_tree.as_ref(),
                    Some(&commit_tree),
                    Some(&mut single_file_opts),
                )
                .map_err(|e| format!("Failed to create single-file diff: {e}"))?;
            parse_diff_to_lines(&mut single_file_diff).unwrap_or_default()
        };
        results.push(GitDiff {
            file_path: file_path.clone(),
            old_path: old_path.clone(),
            new_path: new_path.clone(),
            is_new,
            is_deleted,
            is_renamed,
            is_binary,
            is_image,
            old_blob_base64,
            new_blob_base64,
            lines,
        });
    }
    Ok(results)
}

#[command]
pub fn git_branches(repo_path: String) -> Result<Vec<String>, String> {
    _git_branches(repo_path).into_string_error()
}

fn _git_branches(repo_path: String) -> Result<Vec<String>> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let branches = repo
        .branches(Some(BranchType::Local))
        .context("Failed to list branches")?;

    let mut branch_names = Vec::new();
    for branch in branches {
        let (branch, _) = branch.context("Failed to get branch")?;
        if let Some(name) = branch.name().context("Failed to get branch name")? {
            branch_names.push(name.to_string());
        }
    }

    Ok(branch_names)
}

#[command]
pub fn git_checkout(repo_path: String, branch_name: String) -> Result<(), String> {
    _git_checkout(repo_path, branch_name).into_string_error()
}

fn _git_checkout(repo_path: String, branch_name: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let obj = repo
        .revparse_single(&format!("refs/heads/{}", branch_name))
        .context("Failed to find branch")?;

    repo.checkout_tree(&obj, None)
        .context("Failed to checkout tree")?;

    repo.set_head(&format!("refs/heads/{}", branch_name))
        .context("Failed to update HEAD")?;

    Ok(())
}

#[command]
pub fn git_create_branch(
    repo_path: String,
    branch_name: String,
    from_branch: Option<String>,
) -> Result<(), String> {
    _git_create_branch(repo_path, branch_name, from_branch).into_string_error()
}

fn _git_create_branch(
    repo_path: String,
    branch_name: String,
    from_branch: Option<String>,
) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let target = if let Some(from) = from_branch {
        repo.revparse_single(&from)
            .context("Failed to find source branch")?
            .peel_to_commit()
            .context("Failed to peel to commit")?
    } else {
        repo.head()
            .context("Failed to get HEAD")?
            .peel_to_commit()
            .context("Failed to peel HEAD to commit")?
    };

    let branch = repo
        .branch(&branch_name, &target, false)
        .context("Failed to create branch")?;

    let refname = branch
        .get()
        .name()
        .context("Failed to get branch reference name")?;

    repo.set_head(refname)
        .context("Failed to set HEAD to new branch")?;

    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
        .context("Failed to checkout new branch")?;

    Ok(())
}

#[command]
pub fn git_delete_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    _git_delete_branch(repo_path, branch_name).into_string_error()
}

fn _git_delete_branch(repo_path: String, branch_name: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let mut branch = repo
        .find_branch(&branch_name, BranchType::Local)
        .context("Failed to find branch")?;

    branch.delete().context("Failed to delete branch")?;

    Ok(())
}

#[command]
pub fn git_discard_file_changes(repo_path: String, file_path: String) -> Result<(), String> {
    _git_discard_file_changes(repo_path, file_path).into_string_error()
}

fn _git_discard_file_changes(repo_path: String, file_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let head = repo
        .head()
        .context("Failed to get HEAD")?
        .peel_to_tree()
        .context("Failed to get HEAD tree")?;

    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force().update_index(true).path(&file_path);

    repo.checkout_tree(head.as_object(), Some(&mut checkout_opts))
        .context("Failed to checkout file")?;

    Ok(())
}

#[command]
pub fn git_discard_all_changes(repo_path: String) -> Result<(), String> {
    _git_discard_all_changes(repo_path).into_string_error()
}

fn _git_discard_all_changes(repo_path: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let head = repo
        .head()
        .context("Failed to get HEAD")?
        .peel_to_commit()
        .context("Failed to get HEAD commit")?;

    repo.reset(head.as_object(), git2::ResetType::Hard, None)
        .context("Failed to reset to HEAD")?;

    Ok(())
}

#[command]
pub fn git_push(repo_path: String, branch: Option<String>, remote: String) -> Result<(), String> {
    _git_push(repo_path, branch, remote).into_string_error()
}

fn _git_push(repo_path: String, branch: Option<String>, remote: String) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let mut args = vec!["push", &remote];
    let branch_str;
    if let Some(b) = branch {
        branch_str = b;
        args.push(&branch_str);
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(&args)
        .output()
        .context("Failed to execute git push")?;

    if !output.status.success() {
        bail!(
            "Git push failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_pull(repo_path: String, branch: Option<String>, remote: String) -> Result<(), String> {
    _git_pull(repo_path, branch, remote).into_string_error()
}

fn _git_pull(repo_path: String, branch: Option<String>, remote: String) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let mut args = vec!["pull", &remote];
    let branch_str;
    if let Some(b) = branch {
        branch_str = b;
        args.push(&branch_str);
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(&args)
        .output()
        .context("Failed to execute git pull")?;

    if !output.status.success() {
        bail!(
            "Git pull failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_fetch(repo_path: String, remote: Option<String>) -> Result<(), String> {
    _git_fetch(repo_path, remote).into_string_error()
}

fn _git_fetch(repo_path: String, remote: Option<String>) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let mut args = vec!["fetch"];
    let remote_str;
    if let Some(r) = remote {
        remote_str = r;
        args.push(&remote_str);
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(&args)
        .output()
        .context("Failed to execute git fetch")?;

    if !output.status.success() {
        bail!(
            "Git fetch failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_init(repo_path: String) -> Result<(), String> {
    _git_init(repo_path).into_string_error()
}

fn _git_init(repo_path: String) -> Result<()> {
    Repository::init(&repo_path).context("Failed to initialize repository")?;
    Ok(())
}

#[command]
pub fn git_get_remotes(repo_path: String) -> Result<Vec<GitRemote>, String> {
    _git_get_remotes(repo_path).into_string_error()
}

fn _git_get_remotes(repo_path: String) -> Result<Vec<GitRemote>> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let remote_names = repo.remotes().context("Failed to get remote names")?;

    let mut remotes = Vec::new();
    for name in remote_names.iter().flatten() {
        let remote = repo.find_remote(name).context("Failed to find remote")?;
        if let Some(url) = remote.url() {
            remotes.push(GitRemote {
                name: name.to_string(),
                url: url.to_string(),
            });
        }
    }

    Ok(remotes)
}

#[command]
pub fn git_add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    _git_add_remote(repo_path, name, url).into_string_error()
}

fn _git_add_remote(repo_path: String, name: String, url: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    repo.remote(&name, &url).context("Failed to add remote")?;
    Ok(())
}

#[command]
pub fn git_remove_remote(repo_path: String, name: String) -> Result<(), String> {
    _git_remove_remote(repo_path, name).into_string_error()
}

fn _git_remove_remote(repo_path: String, name: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    repo.remote_delete(&name)
        .context("Failed to remove remote")?;
    Ok(())
}

#[command]
pub fn git_get_stashes(repo_path: String) -> Result<Vec<GitStash>, String> {
    _git_get_stashes(repo_path).into_string_error()
}

fn _git_get_stashes(repo_path: String) -> Result<Vec<GitStash>> {
    let repo_dir = Path::new(&repo_path);

    if !repo_dir.join(".git").exists() {
        bail!("Not a git repository");
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(["stash", "list", "--format=%gd|%s|%ai"])
        .output()
        .context("Failed to execute git stash list")?;

    let mut stashes = Vec::new();
    if output.status.success() {
        let stash_text = String::from_utf8_lossy(&output.stdout);
        for (index, line) in stash_text.lines().enumerate() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 3 {
                let message = if parts[1].starts_with("On ") && parts[1].contains(": ") {
                    parts[1].split(": ").nth(1).unwrap_or(parts[1]).to_string()
                } else {
                    parts[1].to_string()
                };
                stashes.push(GitStash {
                    index,
                    message,
                    date: parts[2].to_string(),
                });
            }
        }
    }

    Ok(stashes)
}

#[command]
pub fn git_create_stash(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<(), String> {
    _git_create_stash(repo_path, message, include_untracked).into_string_error()
}

fn _git_create_stash(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let mut args = vec!["stash", "push"];
    if include_untracked {
        args.push("-u");
    }
    if let Some(msg) = &message {
        args.push("-m");
        args.push(msg);
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(&args)
        .output()
        .context("Failed to execute git stash push")?;

    if !output.status.success() {
        bail!(
            "Git stash create failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_apply_stash(repo_path: String, stash_index: usize) -> Result<(), String> {
    _git_apply_stash(repo_path, stash_index).into_string_error()
}

fn _git_apply_stash(repo_path: String, stash_index: usize) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(["stash", "apply", &format!("stash@{{{stash_index}}}")])
        .output()
        .context("Failed to execute git stash apply")?;

    if !output.status.success() {
        bail!(
            "Git stash apply failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_pop_stash(repo_path: String, stash_index: Option<usize>) -> Result<(), String> {
    _git_pop_stash(repo_path, stash_index).into_string_error()
}

fn _git_pop_stash(repo_path: String, stash_index: Option<usize>) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let mut args = vec!["stash", "pop"];
    let index_str;
    if let Some(idx) = stash_index {
        index_str = format!("stash@{{{idx}}}");
        args.push(&index_str);
    }

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(&args)
        .output()
        .context("Failed to execute git stash pop")?;

    if !output.status.success() {
        bail!(
            "Git stash pop failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_drop_stash(repo_path: String, stash_index: usize) -> Result<(), String> {
    _git_drop_stash(repo_path, stash_index).into_string_error()
}

fn _git_drop_stash(repo_path: String, stash_index: usize) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(["stash", "drop", &format!("stash@{{{stash_index}}}")])
        .output()
        .context("Failed to execute git stash drop")?;

    if !output.status.success() {
        bail!(
            "Git stash drop failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_get_tags(repo_path: String) -> Result<Vec<GitTag>, String> {
    _git_get_tags(repo_path).into_string_error()
}

fn _git_get_tags(repo_path: String) -> Result<Vec<GitTag>> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;
    let tag_names = repo.tag_names(None).context("Failed to get tag names")?;

    let mut tags: Vec<GitTag> = tag_names
        .iter()
        .flatten()
        .filter_map(|name| {
            repo.revparse_single(&format!("refs/tags/{}", name))
                .ok()
                .map(|obj| (name, obj))
        })
        .map(|(name, obj)| {
            let (commit_id, message, date) = match obj.as_tag() {
                Some(tag) => (
                    tag.target_id().to_string(),
                    tag.message().map(|m| m.to_string()),
                    format_git_time(tag.tagger().map(|t| t.when().seconds())),
                ),
                None => match obj.peel_to_commit() {
                    Ok(commit) => (
                        commit.id().to_string(),
                        None,
                        format_git_time(Some(commit.time().seconds())),
                    ),
                    Err(_) => (obj.id().to_string(), None, String::new()),
                },
            };

            GitTag {
                name: name.to_string(),
                commit: commit_id,
                message,
                date,
            }
        })
        .collect();

    tags.sort_by(|a, b| b.date.cmp(&a.date));

    Ok(tags)
}

fn format_git_time(seconds: Option<i64>) -> String {
    seconds
        .and_then(|s| chrono::DateTime::<chrono::Utc>::from_timestamp(s, 0))
        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
        .unwrap_or_default()
}

#[command]
pub fn git_create_tag(
    repo_path: String,
    name: String,
    message: Option<String>,
    commit: Option<String>,
) -> Result<(), String> {
    _git_create_tag(repo_path, name, message, commit).into_string_error()
}

fn _git_create_tag(
    repo_path: String,
    name: String,
    message: Option<String>,
    commit: Option<String>,
) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    let target = if let Some(commit_ref) = commit {
        repo.revparse_single(&commit_ref)
            .context("Failed to find commit")?
    } else {
        repo.head()
            .context("Failed to get HEAD")?
            .peel_to_commit()
            .context("Failed to peel HEAD to commit")?
            .into_object()
    };

    if let Some(msg) = message {
        let signature = repo.signature().context("Failed to get signature")?;
        repo.tag(&name, &target, &signature, &msg, false)
            .context("Failed to create annotated tag")?;
    } else {
        repo.tag_lightweight(&name, &target, false)
            .context("Failed to create lightweight tag")?;
    }

    Ok(())
}

#[command]
pub fn git_delete_tag(repo_path: String, name: String) -> Result<(), String> {
    _git_delete_tag(repo_path, name).into_string_error()
}

fn _git_delete_tag(repo_path: String, name: String) -> Result<()> {
    let repo = Repository::open(&repo_path).context("Failed to open repository")?;

    repo.tag_delete(&name).context("Failed to delete tag")?;

    Ok(())
}

#[derive(serde::Deserialize)]
pub struct GitHunk {
    pub file_path: String,
    pub lines: Vec<GitDiffLine>,
}

fn create_patch_from_hunk(hunk: &GitHunk) -> Result<String, String> {
    let mut patch = String::new();

    // Find header line
    let header_line = hunk
        .lines
        .iter()
        .find(|line| matches!(line.line_type, DiffLineType::Header))
        .ok_or_else(|| {
            log::error!(
                "No header line found in hunk. Line types present: {:?}",
                hunk.lines.iter().map(|l| &l.line_type).collect::<Vec<_>>()
            );
            "No header line found in hunk".to_string()
        })?;

    // Write git diff header first
    patch.push_str(&format!(
        "diff --git a/{} b/{}\n",
        hunk.file_path, hunk.file_path
    ));
    patch.push_str(&format!("--- a/{}\n", hunk.file_path));
    patch.push_str(&format!("+++ b/{}\n", hunk.file_path));
    patch.push_str(&header_line.content);
    // Only add newline if header doesn't already end with one
    if !header_line.content.ends_with('\n') {
        patch.push('\n');
    }

    // Write hunk content
    for line in &hunk.lines {
        match line.line_type {
            DiffLineType::Added => {
                patch.push('+');
                patch.push_str(&line.content);
                patch.push('\n');
            }
            DiffLineType::Removed => {
                patch.push('-');
                patch.push_str(&line.content);
                patch.push('\n');
            }
            DiffLineType::Context => {
                patch.push(' ');
                patch.push_str(&line.content);
                patch.push('\n');
            }
            DiffLineType::Header => {} // Skip header lines as we already processed them
        }
    }

    Ok(patch)
}

#[command]
pub fn git_stage_hunk(repo_path: String, hunk: GitHunk) -> Result<(), String> {
    _git_stage_hunk(repo_path, hunk).into_string_error()
}

fn _git_stage_hunk(repo_path: String, hunk: GitHunk) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let patch_content = create_patch_from_hunk(&hunk).map_err(|e| anyhow::anyhow!(e))?;

    let mut temp_file = NamedTempFile::new().context("Failed to create temp file")?;
    temp_file
        .write_all(patch_content.as_bytes())
        .context("Failed to write patch")?;
    temp_file.flush().context("Failed to flush temp file")?;

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args(["apply", "--cached", temp_file.path().to_str().unwrap()])
        .output()
        .context("Failed to apply patch")?;

    if !output.status.success() {
        bail!(
            "Failed to stage hunk: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

#[command]
pub fn git_unstage_hunk(repo_path: String, hunk: GitHunk) -> Result<(), String> {
    _git_unstage_hunk(repo_path, hunk).into_string_error()
}

fn _git_unstage_hunk(repo_path: String, hunk: GitHunk) -> Result<()> {
    let repo_dir = Path::new(&repo_path);
    let patch_content = create_patch_from_hunk(&hunk).map_err(|e| anyhow::anyhow!(e))?;

    let mut temp_file = NamedTempFile::new().context("Failed to create temp file")?;
    temp_file
        .write_all(patch_content.as_bytes())
        .context("Failed to write patch")?;
    temp_file.flush().context("Failed to flush temp file")?;

    let output = Command::new("git")
        .current_dir(repo_dir)
        .args([
            "apply",
            "--reverse",
            "--cached",
            temp_file.path().to_str().unwrap(),
        ])
        .output()
        .context("Failed to apply reverse patch")?;

    if !output.status.success() {
        bail!(
            "Failed to unstage hunk: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}
