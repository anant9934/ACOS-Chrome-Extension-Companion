# 🌌 Autonomous Context Operating System (ACOS)

### *The Universal Infrastructure for AI Cognition*

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Companion-blue.svg)](https://chrome.google.com/webstore)

ACOS is a deterministic, adaptive, local-first operating system designed to orchestrate high-value context for LLMs. It eliminates "context amnesia," prevents hallucinations, and maximizes reasoning quality by surgically slicing code and managing cognitive bandwidth.

---

## 🚀 Core Components

### 🛰️ [Universal AI Context Companion](apps/chrome-extension)
A production-grade Chrome extension that intercepts web-based AI conversations (ChatGPT, Claude, Gemini) to optimize prompts and preserve semantic continuity in real-time.

### 🔌 [VS Code Extension](apps/vscode-extension)
The workspace intelligence layer. It builds semantic graphs of your codebase, traces symbol dependencies, and compiles optimized context packets directly from your editor.

### 🧠 [@repo/core](packages/core)
The engine room. A pure TypeScript library containing the **CRE** (Relevance), **CPC** (Compiler), and **ACIS** (Adaptive Intelligence) subsystems.

---

## ✨ Key Features

- **Semantic Slicing**: Don't dump files. Extract precise functions, hooks, and types using AST analysis.
- **Cognitive Bandwidth Scheduling**: Dynamically allocate token budgets based on task priority (Critical, Important, Supplemental).
- **Hallucination Prevention**: Predictive engine that detects context ambiguity and fragmentation before you send your prompt.
- **Model-Aware Adaptation**: Automatically virtualizes context differently for GPT-4o, Claude 3.5, and Gemini.
- **Local-First Privacy**: Zero cloud telemetry. All analysis, summarization, and memory storage happen on your machine.

---

## 🛠️ Architecture

ACOS operates as a five-layer orchestration pipeline:
1. **Acquisition**: Real-time monitoring of editor state, git activity, and terminal logs.
2. **Relevance (CRE)**: Deterministic scoring of file and symbol importance.
3. **Compilation (CPC)**: AST-driven extraction and token budget allocation.
4. **Adaptation (ACIS)**: Model-specific reordering and semantic density tuning.
5. **Memory**: Persistent local storage of successful reasoning paths and architectural maps.

---

## 📦 Installation

### For Developers (Local Load)
1. Clone the repo: `git clone https://github.com/yourusername/acos-engine.git`
2. Install dependencies: `pnpm install`
3. Build the core: `pnpm build`
4. Load the Chrome Extension:
   - Go to `chrome://extensions`
   - Enable **Developer Mode**
   - Click **Load Unpacked** and select `apps/chrome-extension/build/chrome-mv3-prod`

---

## 🗺️ Roadmap
- [ ] **Phase 1**: Recursive symbol dependency resolution.
- [ ] **Phase 2**: Local vector embeddings for semantic search.
- [ ] **Phase 3**: Cross-tab continuity and project topology mapping.
- [ ] **Phase 4**: Enterprise-grade context virtualization.

---

## 🤝 Contributing
We welcome contributions! Please see our [Contribution Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the ACOS Community
</p>
# token-optimization-extension
