import { VirtualFile } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

interface GithubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

const IMPORTANT_FILES = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "next.config.js",
  "README.md",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "Dockerfile"
];

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    // Attempt to handle "owner/repo" string format
    const parts = url.split("/");
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  return null;
}

export const fetchGithubRepo = async (
  repoUrl: string, 
  token?: string,
  onLog?: (msg: string) => void
): Promise<VirtualFile[]> => {
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) throw new Error("Invalid GitHub Repository URL");

  const headers: HeadersInit = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  onLog?.(`Connecting to GitHub API: ${repoInfo.owner}/${repoInfo.repo}...`);

  // 1. Get the default branch SHA
  const repoResp = await fetch(`${GITHUB_API_BASE}/repos/${repoInfo.owner}/${repoInfo.repo}`, { headers });
  if (!repoResp.ok) throw new Error(`Failed to fetch repo info: ${repoResp.statusText}`);
  const repoData = await repoResp.json();
  const defaultBranch = repoData.default_branch;

  // 2. Get the Recursive Tree
  onLog?.(`Fetching file tree from branch: ${defaultBranch}...`);
  const treeResp = await fetch(`${GITHUB_API_BASE}/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeResp.ok) throw new Error(`Failed to fetch file tree: ${treeResp.statusText}`);
  const treeData = await treeResp.json();
  
  const tree: GithubTreeItem[] = treeData.tree;

  // 3. Filter and Map to VirtualFiles
  // We limit to 50 files for the demo context window, prioritizing important ones + root files
  const interestingFiles = tree
    .filter(item => item.type === "blob") // Only files
    .filter(item => !item.path.includes("node_modules") && !item.path.includes(".git") && !item.path.includes("lock"))
    .sort((a, b) => {
        // Prioritize important files
        const aImp = IMPORTANT_FILES.some(f => a.path.endsWith(f));
        const bImp = IMPORTANT_FILES.some(f => b.path.endsWith(f));
        if (aImp && !bImp) return -1;
        if (!aImp && bImp) return 1;
        return 0;
    })
    .slice(0, 30); // Limit to 30 files for analysis

  const result: VirtualFile[] = [];

  // 4. Fetch Content for key config files
  onLog?.(`Analyzing ${interestingFiles.length} relevant files...`);
  
  for (const item of interestingFiles) {
    let contentHint = "Source Code File";
    let intent = "Implementation";

    // Determine intent based on extension
    if (item.path.endsWith(".json") || item.path.endsWith(".toml") || item.path.endsWith(".yaml")) intent = "Configuration";
    if (item.path.endsWith(".md")) intent = "Documentation";
    if (item.path.includes("test") || item.path.includes("spec")) intent = "Testing";

    // Fetch content for critical files
    if (IMPORTANT_FILES.some(f => item.path.endsWith(f))) {
      try {
        onLog?.(`Reading content: ${item.path}`);
        const contentResp = await fetch(item.url, { headers }); // Blob URL
        const contentData = await contentResp.json();
        const decodedContent = atob(contentData.content); // Base64 decode
        
        // Truncate content to avoid token limits
        contentHint = decodedContent.substring(0, 1000).replace(/\n/g, " ");
        if (decodedContent.length > 1000) contentHint += "... (truncated)";
      } catch (e) {
        console.warn(`Failed to fetch content for ${item.path}`, e);
      }
    } else {
       contentHint = `Path: ${item.path}`;
    }

    result.push({
      path: item.path,
      intent,
      content_hint: contentHint
    });
  }

  return result;
};