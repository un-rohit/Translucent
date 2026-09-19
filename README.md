# 🌌 Translucent

[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://microsoft.com)
[![Framework](https://img.shields.io/badge/.NET-8.0--windows-purple.svg)](https://dotnet.microsoft.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![WPF](https://img.shields.io/badge/UI-WPF-orange.svg)](https://github.com/dotnet/wpf)

**Translucent** (formerly *InvisibleChat*) is a modern, stealth-focused AI companion and desktop assistant for Windows. Built with WPF and .NET 8, it combines a highly configurable AI chat client, a multi-tab web browser, and local speech-to-text live captioning into a single window that is **completely invisible to screen capture tools, screenshots, and screen-sharing applications**.

---

## 🌟 Key Features

### 🛡️ 1. Zero-Capture Stealth Mode
The application window utilizes Windows' native `SetWindowDisplayAffinity` API (`WDA_EXCLUDEFROMCAPTURE`). 
* **Screenshare Proof:** When sharing your screen via Zoom, Microsoft Teams, Discord, or Slack, the Translucent window is completely omitted.
* **Recording/Capture Proof:** It will not appear in screenshots (Snipping Tool, PrintScreen) or recording software (OBS Studio, Camtasia). To the capturing system, it is entirely transparent.

### 📸 2. Multimodal Vision Screen Snipper (`Ctrl + Shift + S`)
Capture any portion of your screen discreetly and query AI models with multimodal vision:
* **Anti-Capture Overlay:** The snip selector window is itself excluded from screen capture (`WDA_EXCLUDEFROMCAPTURE`), ensuring zero flickering or detection during screen sharing.
* **Instant Multimodal Ingestion:** Snips are converted directly to base64 images and sent to Gemini 2.0 / OpenAI Vision models.
* **Solve Coding, Math & Documents:** Select problem statements, diagrams, or spreadsheets on your screen to receive immediate AI answers.

### ⚡ 3. Live Meeting & Interview AI Co-pilot
* **One-Click "⚡ Ask AI":** Beside every transcribed speech bubble in the captions panel, click to receive instant coaching, answers, or talking points without typing.
* **Auto Co-pilot Mode:** Automatically detects question patterns in meetings or interviews and provides contextual assistance in real-time.
* **Dual Audio Source:** Easily switch between recording what others say (Speakers Loopback via WASAPI) and what you say (Microphone via WaveIn).

### 💬 4. Real-time Streaming AI
* **Token-by-Token Streaming:** Uses Server-Sent Events (SSE) for Gemini (`streamGenerateContent`) and OpenAI (`stream: true`), streaming answers with a typing cursor as they generate.
* **Multimodal Image Previews:** Attachments and snips are rendered cleanly in chat history bubbles.
* **Dual-Engine Flexibility:** Connect to Gemini 2.0 Flash, OpenAI, Groq, Ollama, or OpenRouter with custom system prompts.

### 🔀 5. Productivity Split View & 👻 Ghost Mode
* **Split View (`Ctrl + Shift + V`):** View the private Chromium browser and AI chat side-by-side with an adjustable drag splitter.
* **Ghost Click-Through (`Ctrl + Shift + T`):** Activates `WS_EX_TRANSPARENT`, allowing you to keep Translucent visible while clicking directly through it onto background applications.
* **Panic Key (`Escape`):** Instantly vanishes the window to the system tray.

### 🌐 6. Stealth Multi-Tab Web Browser
An integrated Chromium-based browser utilizing Microsoft WebView2.
* Browse the web privately within the same anti-capture frame.
* Supports multiple tabs, bookmarks, URL navigation, and customized page-level opacity injection.

### ⚡ 5. Global Hotkeys & System Tray Integration
* **`Ctrl + Shift + G`:** Instantly toggles the window's visibility from anywhere in Windows, making it disappear or reappear instantly.
* **System Tray Resident:** Minimize to tray, double-click to show/hide, or right-click to access quick options.
* **Window Settings:** Customize opacity slider ($10\%$ to $100\%$) and toggle "Always on Top" (`Topmost`).

---

## 🛠️ Architecture & Core Technologies

* **Frontend:** WPF (Windows Presentation Foundation) with modern dark/glassmorphic custom controls and templates.
* **Browser Engine:** [Microsoft WebView2 Wpf](https://www.nuget.org/packages/Microsoft.Web.WebView2) (Chromium under the hood).
* **Audio Loopback:** [NAudio](https://github.com/naudio/NAudio) (captures Windows speaker output).
* **Local STT:** `System.Speech.Recognition` (Windows Dictation Grammar).
* **API Client:** `System.Net.Http` with custom serialization templates for Gemini and OpenAI API structures.

---

## 🚀 Getting Started

### Prerequisites
* **Operating System:** Windows 10 (version 2004 or later is recommended for WDA exclude support) or Windows 11.
* **Runtime:** [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* **Browser Backend:** [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on most modern Windows systems).

### Installation & Run

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/un-rohit/Translucent.git
   cd Translucent
   ```

2. **Restore & Build:**
   ```bash
   dotnet build
   ```

3. **Run the Application:**
   ```bash
   dotnet run --project InvisibleChat.csproj
   ```

---

## ⚙️ Configuration & Setup

1. Launch Translucent and open settings by clicking the **Gear Icon (⚙️)** in the sidebar.
2. **AI Provider:**
   * **Gemini (Recommended):** Enter your API key from [Google AI Studio](https://aistudio.google.com/).
   * **Custom OpenAI Endpoints:** Provide your custom API Endpoint URL (e.g. `http://localhost:11434/v1/chat/completions` for Ollama) and your model tag name.
3. Configure the window **Opacity** and toggle **Topmost** to match your preferences.

---

## ⌨️ Shortcut Summary

| Shortcut | Description | Scope |
| :--- | :--- | :--- |
| **`Ctrl + Shift + G`** | Stealth Show / Hide Translucent Window | **Global** (Works anywhere in Windows) |
| **`Ctrl + Shift + S`** | Stealth Screen Snip & Vision Prompt | **Global** (Captures background area underneath) |
| **`Ctrl + Shift + T`** | Toggle Ghost Mode (Click-Through Transparency) | **Global** |
| **`Ctrl + Shift + V`** | Toggle Side-by-Side Split View (Browser & Chat) | Local / Title Bar |
| **`Escape`** | Panic Key — Instantly Hide to Tray | Local (When not editing text) |
| **`Enter`** | Send AI Chat Message | Local (Chat Input Focused) |
| **`Shift + Enter`** | Insert Newline in Chat Input | Local (Chat Input Focused) |

---

## 🔒 Security & Privacy Notice
* **Capture Exclusion:** While `SetWindowDisplayAffinity` successfully hides the window from standard Windows capture APIs, it does not defend against physical hardware capture devices (e.g. external capture cards, camera recording your screen) or low-level kernel drivers.
* **Local Keys:** Your API keys are stored locally on your machine in application configurations and are only sent directly to the specified API endpoints.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
