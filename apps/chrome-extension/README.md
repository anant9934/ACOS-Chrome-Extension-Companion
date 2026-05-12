# 🛰️ ACOS Chrome Extension Companion

This is the production-grade intelligence layer for the **Autonomous Context Operating System (ACOS)**. It intercepts prompts on major AI platforms to perform real-time semantic optimization.

---

## 🚀 Getting Started

### 1. Development Mode
Run the development server to enable hot-reloading:

```bash
pnpm dev
```

### 2. Loading into Chrome
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer Mode**.
3. Click **Load Unpacked**.
4. Select the `apps/chrome-extension/build/chrome-mv3-dev` directory.

---

## 🛠️ Build for Production

To create a production-optimized bundle:

```bash
pnpm build
```

The output will be located in `build/chrome-mv3-prod`.

---

## ✨ Features

- **Multi-Platform Support**: Works on ChatGPT, Claude, Gemini, DeepSeek, and Perplexity.
- **Context Relevance Engine (CRE)**: AST-driven analysis of your code prompts.
- **Command Palette**: `Cmd/Ctrl + Shift + K` to trigger advanced orchestration.
- **PII Shield**: Automatic detection of secrets and sensitive data.
- **Token Analytics**: Real-time tracking of token savings and efficiency.

---

## 🏗️ Architecture

- **`contents/companion.ts`**: The main content script that injects the ACOS intelligence layer.
- **`background.ts`**: Handles the heavy lifting of the optimization pipeline via the `@repo/core` library.
- **`sidepanel.tsx`**: Advanced analytics and audit logs.
- **`popup.tsx`**: Quick settings and status overview.

---

[Return to Root README](../../README.md)

