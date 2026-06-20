# Claude Usage Tracker & Prompt Optimizer

Claude Usage Tracker is a powerful, privacy-first browser extension designed to help you track context window usage, estimate API costs, analyze daily consumption, export conversations, and optimize prompts directly on the [Claude.ai](https://claude.ai) interface.

---

## 🌟 Why is it Useful?

When interacting with Claude, particularly on long chats, it is easy to hit context limits unexpectedly, leading to memory truncation or session limits. This extension provides:
1. **Context Visibility**: Real-time feedback on how much of the context window (100k or 200k tokens) your current chat has consumed.
2. **Cost Awareness**: Immediate estimates of the cost of your current context, helping you evaluate efficiency.
3. **Usage Analytics**: Visual reports of daily token consumption to monitor usage behavior.
4. **Improved Prompt Results**: A built-in Prompt Optimizer to easily structure raw prompts using Anthropic's best practices, yielding higher-quality model responses.

---

## 🚀 Key Features

### 1. Real-Time Token Tracking
- **Local Estimation**: Uses a local BPE tokenizer to quickly estimate token counts as you type, with zero network lag.
- **Exact Token Counting**: If you provide an Anthropic API Key, the extension utilizes the official Anthropic token counting endpoint to report exact numbers.
- **Visual Progress Bar**: Displays a subtle progress bar at the bottom of the Claude input box that changes color (indigo, orange, red) as you approach context limits.

### 2. Prompt Optimizer (New!)
Accessed via the **Sparkles** icon right next to the export button:
- **AI-Powered Mode**: If an API key is present, uses `claude-3-5-sonnet` to rewrite your raw prompt using expert prompt engineering guidelines.
- **Local Offline Mode**: Works completely offline if no key is present, wrapping your inputs into XML structures and adding structural guidelines automatically.
- **4 Optimization Profiles**:
  - **General**: Refines clarity, structures steps, and formats final output rules.
  - **Coding & Tech**: Formats code snippet wrappers, outlines error boundaries, and lists test requirements.
  - **Creative Writing**: Enhances imagery, sets narrative tone/voice, and filters out common AI clichés.
  - **Logic & Analysis**: Adds step-by-step `<thinking>` steps and logical consistency check instructions.
- **Instant Injection**: Clicking "Use Optimized Prompt" replaces the input text area and places your keyboard focus back on the input box, ready to submit.

### 3. Conversation Exporting
- Export your chat logs to **Markdown** format with a single click, keeping conversations formatted and saved locally.

### 4. Daily Analytics Dashboards
- View graphs showing daily tokens consumed and estimated value used.

---

## ⚙️ How It Works

1. **DOM Injection**: When you visit `claude.ai`, a MutationObserver waits for the chat input fieldset to render and attaches a lightweight React app (`ContentApp.tsx`) inside the input container.
2. **Off-Thread Tokenization**: As you interact, the extension estimates token values off-thread using BPE mapping.
3. **Background Communication**: The content script communicates via Chrome runtime messages with the extension background worker (`background/index.ts`) to count exact tokens, retrieve storage states, or trigger prompt optimizations via fetch requests.

---

## 🔒 Security & Privacy (How It Is Safe)

Security and privacy are the core pillars of the Claude Usage Tracker:

* **Zero External Analytics or Logging**: Your conversation text and metadata never leave your browser. The extension communicates only with `claude.ai` and `api.anthropic.com`. There are no external tracking servers, logs, or intermediate databases.
* **Direct Client-to-API Calls**: All calls to Anthropic's API are dispatched directly from the extension's service worker inside your browser using standard browser HTTPS.
* **Flexible API Key Storage**:
  - **Remember API Key**: Stores the key locally in your browser's extension storage (`chrome.storage.local`).
  - **Ask Each Session**: Stored in temporary session memory (`chrome.storage.session`). The key remains in-memory only and is permanently cleared when the browser or extension processes are closed.
* **Offline Fallbacks**: If you choose not to provide an API key, the tokenizer estimation and local prompt optimizer work **100% offline**, ensuring you still get full utility without sharing keys.
* **Best Practices**: We strongly recommend creating a restricted-scope API key with spend caps in your Anthropic console for additional peace of mind.

---

## 🛠️ Installation & Setup (Developer Mode)

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in your browser:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in the top-right).
   - Click **Load unpacked** in the top-left.
   - Select the **`dist`** folder inside this project directory.
5. Go to [Claude.ai](https://claude.ai) and start tracking!
