import { Router } from "express";
import fetch from "node-fetch";
import { config } from "../config/env";
import { cacheService } from "../services/cache.service";
import { AppError } from "../middleware/errorHandler";
import { GithubRepoInfo, GithubTreeResponse } from "../types/github";

const router = Router();

// Helper to get headers
const getGithubHeaders = (req: any) => {
  const headers: any = {
    'User-Agent': 'Brada-Iota',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  const userToken = req.headers['x-github-token'] as string;
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }
  
  return headers;
};

// Auth URL
router.get("/auth/url", (req, res) => {
  const { githubClientId, appUrl } = config;
  if (!githubClientId) {
    throw new AppError("GitHub OAuth is not configured", 500);
  }

  const redirectUri = `${appUrl || 'http://localhost:3000'}/api/github/auth/callback`;
  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state: Math.random().toString(36).substring(7)
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// Auth Callback
router.get("/auth/callback", async (req, res, next) => {
  try {
    const { code } = req.query;
    const { githubClientId, githubClientSecret, appUrl } = config;

    if (!code) throw new AppError("No code provided", 400);
    if (!githubClientId || !githubClientSecret) throw new AppError("GitHub OAuth not configured", 500);

    const redirectUri = `${appUrl || 'http://localhost:3000'}/api/github/auth/callback`;

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) {
      throw new AppError(tokenData.error_description || tokenData.error, 400);
    }

    const accessToken = tokenData.access_token;

    // Send success message and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${accessToken}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação concluída! Esta janela fechará automaticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
});

// Get User Repositories
router.get("/repos", async (req, res, next) => {
  try {
    const userToken = req.headers['x-github-token'] as string;
    if (!userToken) {
      throw new AppError("GitHub token is required to list repositories", 401);
    }

    const headers = {
      'User-Agent': 'Brada-Iota',
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${userToken}`
    };

    const url = `https://api.github.com/user/repos?sort=updated&per_page=100&type=all`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.json();
      throw new AppError("Failed to fetch repositories", response.status, error);
    }

    const repos = await response.json();
    res.json(repos);
  } catch (error) {
    next(error);
  }
});

// Get Repository Tree (Recursive)
router.get("/tree", async (req, res, next) => {
  try {
    const { owner, repo, branch } = req.query;
    if (!owner || !repo) {
      throw new AppError("Owner and repo are required", 400);
    }

    const headers = getGithubHeaders(req);

    // Resolve branch if not provided
    let targetBranch = branch as string;
    if (!targetBranch) {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoInfoRes.ok) throw new AppError("Repository not found", 404);
      const repoInfo = await repoInfoRes.json() as GithubRepoInfo;
      targetBranch = repoInfo.default_branch;
    }

    // Check cache
    const cachedTree = cacheService.getTree(owner as string, repo as string, targetBranch);
    if (cachedTree) {
      return res.json(cachedTree);
    }

    // Get recursive tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers });
    
    if (!treeRes.ok) {
      const err = await treeRes.json();
      throw new AppError("Failed to fetch repository tree", treeRes.status, err);
    }

    const treeData = await treeRes.json() as GithubTreeResponse;
    const result = {
      owner,
      repo,
      branch: targetBranch,
      tree: treeData.tree
    };

    // Cache the result
    cacheService.setTree(owner as string, repo as string, targetBranch, result);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Helper to check for binary content using magic numbers
const isBinaryBuffer = (buffer: Buffer): boolean => {
  // Check for common binary signatures
  // PDF: %PDF-
  if (buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true;
  
  // ZIP/JAR/DOCX/XLSX: PK..
  if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) return true;

  // PNG: .PNG
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // JPG: 
  if (buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // GIF: GIF8
  if (buffer.length > 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;

  // Check for null bytes in the first 1024 bytes (common heuristic for binary)
  const checkLength = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) return true;
  }

  return false;
};

// Get File Content
router.get("/content", async (req, res, next) => {
  try {
    const { owner, repo, path: filePath, branch } = req.query;
    if (!owner || !repo || !filePath || !branch) {
      throw new AppError("Missing required parameters", 400);
    }

    const cachedContent = cacheService.getFileContent(owner as string, repo as string, branch as string, filePath as string);
    if (cachedContent) {
      return res.send(cachedContent);
    }

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const headers = getGithubHeaders(req);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new AppError("Failed to fetch file content", response.status);
    }

    const buffer = await response.buffer();
    
    if (isBinaryBuffer(buffer)) {
      return res.status(400).send("Binary files are not supported for analysis");
    }

    const content = buffer.toString('utf-8');
    cacheService.setFileContent(owner as string, repo as string, branch as string, filePath as string, content);
    res.send(content);
  } catch (error) {
    next(error);
  }
});

export default router;
