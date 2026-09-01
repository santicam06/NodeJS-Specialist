## 🎉 Initial Release (v1.0.0)

> Welcome to the first official release of **Pull-Reqs-Explainer**!

### ✨ Features
- **PR Explanation**: Analyze any GitHub Pull Request via URL (`npx tsx src/pr-explain.ts "<GitHub PR URL>"`)
- **Smart Model Selection**: Automatically chooses Gemini 2.5 Flash for small PRs (≤50K chars) or Gemini 2.5 Pro for large PRs (>50K chars)
- **Tool-Calling Loop**: LLM can fetch specific GitHub files for deeper context when the patch and comments aren't enough (up to 5 iterations)
- **Auto-generated Reports**: Markdown reports saved to `./reports/` with Summary, Discussion, Assessment, and Socratic Questions sections
- **Local Caching**: Fetched GitHub files are cached in `.cache/` to avoid refetching and control rate limits
- **Verbose Debugging**: `--verbose` flag captures traces to `src/debug.txt`

### 🚀 Getting Started
To get started with this release, please refer to the installation instructions in the `README.md`.

### 📝 Notes
- Requires **Node.js 18+**, **Python**, and **Git** installed
- Needs `OPENROUTER_API_KEY` in `.env` (uses Google Gemini models via OpenRouter)
- `debug.txt` is overridden each time verbose mode runs.
- Reports saved to `reports/pull_req_[NUMBER].md`