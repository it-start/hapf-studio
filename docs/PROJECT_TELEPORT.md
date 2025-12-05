# Project Teleport Protocol

**Purpose:** To serialize a complete software project (file structure, content, metadata) into a single, portable, semantic HAPF Bundle file. This allows "teleporting" a project between environments or AI contexts.

## The `.hapf` Bundle Structure

A HAPF Bundle is essentially a generic HAPF data structure, usually output by the `project-teleport` pipeline.

### Schema

```hapf
type HapfBundle struct {
  id: UUID                # Unique Bundle ID
  timestamp: Date         # Creation time
  source_origin: String   # e.g. "github.com/user/repo"
  compression_ratio: Float
  total_files: Int
  
  # The Manifest contains the actual file data
  manifest: List<FileEntry>
}

type FileEntry struct {
  path: String            # Relative path: "src/main.ts"
  permissions: String     # Unix octal: "0644"
  encoding: Enum["utf-8", "base64"]
  content: Blob           # The file content
  hash: String            # SHA-256 integrity check
}
```

## Protocols

### 1. Packing (Compile)
**Source**: Local Filesystem or Git Repo.
**Target**: `project.hapf` (JSON/HAPF-Object serialized).

1.  **Walk**: Traverse directory tree (respecting `.gitignore`).
2.  **Filter**: Exclude binary blobs > 10MB (unless essential) and lockfiles.
3.  **Process**:
    -   Text files: Store as `utf-8`.
    -   Images/Binaries: Store as `base64`.
4.  **Minify (Optional)**: If `compression_level` is HIGH, whitespace/comments may be stripped from code files to save token space.
5.  **Serialize**: Output the `HapfBundle` object.

### 2. Unpacking (Decompile/Hydrate)
**Source**: `project.hapf`
**Target**: Local Filesystem.

1.  **Validate**: Check `hash` integrity of entries.
2.  **Write**: Create directories and write files.
3.  **Permissions**: Restore `chmod` permissions (executable bits).

## Use Cases

1.  **AI Context Loading**: Instead of pasting 50 files into chat, upload 1 `project.hapf` bundle.
2.  **Archival**: Semantic snapshots of code at a specific point in time.
3.  **Migration**: Moving a project from one HAPF Runtime to another.
