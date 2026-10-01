'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Download,
  Key,
  Cpu,
  Sparkles,
  Zap,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Terminal,
  BookOpen,
  Layers,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Laptop
} from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  models: string[];
  defaultModel: string;
  keyUrl: string;
  keyPrefix: string;
  freeTier: string;
  latency: string;
  contextWindow: string;
  description: string;
  setupSteps: string[];
  recommendedFor: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Official / Default',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    models: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'],
    defaultModel: 'gemini-3.8-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AIzaSy...',
    freeTier: 'Generous free tier (up to 15 RPM)',
    latency: '~250ms (Ultra fast)',
    contextWindow: '1M tokens (Deep reasoning & Vision)',
    description: "Google's flagship multimodal model designed for complex reasoning, instant code generation, and multi-image vision analysis. Includes built-in auto-failover in Translucent during peak demand.",
    setupSteps: [
      'Navigate to Google AI Studio API Keys console: aistudio.google.com/apikey',
      'Sign in with your Google account and click "Create API key".',
      'Copy your generated key (starts with AIzaSy...).',
      'Open Translucent Settings (⚙️ icon) -> Select "Google Gemini" -> Paste key.'
    ],
    recommendedFor: 'Best for general queries, screenshot vision analysis, and large context coding.'
  },
  {
    id: 'groq',
    name: 'Groq (Free & Ultra Fast)',
    badge: 'Fastest In The World',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_...',
    freeTier: '100% Free developer access (Generous rate limits)',
    latency: '~80ms (Real-time LPUs)',
    contextWindow: '128K tokens',
    description: 'Powered by Language Processing Units (LPUs) that stream output at an astounding 500+ tokens per second. Completely free with near-instant responses.',
    setupSteps: [
      'Visit the Groq Console at: console.groq.com/keys',
      'Create a free account with GitHub or Google.',
      'Click "Create API Key", name it "Translucent", and copy the token (starts with gsk_).',
      'In Translucent Settings (⚙️ icon), choose "Groq (Free & Ultra Fast)" and paste the key.'
    ],
    recommendedFor: 'Best when you need blazing instantaneous answers during meetings or live coding.'
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    badge: 'Industry Benchmark',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultModel: 'gpt-4o',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-proj-...',
    freeTier: 'Pay-as-you-go / Developer credit',
    latency: '~400ms',
    contextWindow: '128K tokens',
    description: "OpenAI's premiere models offering top-tier coding accuracy, structured responses, and state-of-the-art natural language comprehension.",
    setupSteps: [
      'Go to the OpenAI Developer Platform: platform.openai.com/api-keys',
      'Sign in and navigate to "API Keys" in the dashboard.',
      'Click "Create new secret key", configure permissions, and copy the secret key (starts with sk-).',
      'In Translucent Settings (⚙️), choose "OpenAI (GPT-4o)" and paste your key.'
    ],
    recommendedFor: 'Best for complex system design, nuanced code review, and mission-critical accuracy.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Reasoning Powerhouse',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com',
    keyPrefix: 'sk-...',
    freeTier: 'Free credits upon signup + Low pricing',
    latency: '~350ms',
    contextWindow: '64K tokens',
    description: 'Renowned open-weights reasoning model with high math, logic, and architectural analysis capabilities. Uses standard OpenAI-compatible endpoints.',
    setupSteps: [
      'Head to the DeepSeek Platform: platform.deepseek.com',
      'Sign in and open "API Keys" from the user menu.',
      'Generate a new API key and copy it.',
      'Open Translucent Settings (⚙️), select "DeepSeek", and paste your key.'
    ],
    recommendedFor: 'Best for complex math, algorithms, code refactoring, and logical deductions.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'All-In-One Unified Gateway',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    models: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet'],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    keyUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-v1-...',
    freeTier: 'Access hundreds of free & paid community models',
    latency: '~300ms',
    contextWindow: 'Varies up to 200K tokens',
    description: 'One single API key granting access to 300+ AI models including Claude 3.5 Sonnet, Llama 3.3, Mistral, Command-R, and more with automated fallbacks.',
    setupSteps: [
      'Visit OpenRouter: openrouter.ai/keys',
      'Sign in with Google or Web3 and create a new key.',
      'Copy your token (starts with sk-or-v1-).',
      'In Translucent Settings (⚙️), choose "OpenRouter (All-in-One)" and paste your key.'
    ],
    recommendedFor: 'Best for experimenting with Claude, open-source models, or having a single unified key.'
  },
  {
    id: 'custom',
    name: 'Custom / Local (Ollama)',
    badge: '100% Offline & Private',
    badgeColor: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
    models: ['llama3', 'mistral', 'deepseek-r1', 'qwen2.5-coder'],
    defaultModel: 'llama3',
    keyUrl: 'http://localhost:11434',
    keyPrefix: 'Not required / Optional',
    freeTier: '100% Free & Unlimited (Runs on your hardware)',
    latency: 'Local GPU dependent (~20-100ms)',
    contextWindow: 'Local model dependent (8K - 128K)',
    description: 'Run completely private, uncensored, zero-leak models right on your local PC using Ollama, LM Studio, or vLLM with OpenAI-compatible endpoints.',
    setupSteps: [
      'Download and run Ollama from ollama.com or start your local server.',
      'Pull your desired model in terminal: `ollama run llama3`.',
      'In Translucent Settings (⚙️), select "Custom / Local (Ollama)".',
      'Leave API Key blank (or enter custom key if hosted behind a proxy), set Endpoint to http://localhost:11434/v1.'
    ],
    recommendedFor: 'Best for confidential proprietary code, air-gapped environments, and zero-cost unlimited usage.'
  }
];

export default function DocsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-150px] left-1/4 w-[650px] h-[650px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[450px] right-1/6 w-[550px] h-[550px] bg-indigo-600/12 rounded-full blur-[130px]" />
      </div>

      {/* ─── Navigation Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/25 group-hover:scale-105 transition-transform">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Translucent</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DOCS
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono tracking-wide">Multi-Provider AI &amp; Setup Guide</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            <Link href="/" className="hover:text-purple-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <a href="#quick-table" className="hover:text-purple-300 transition-colors">Comparison Table</a>
            <a href="#provider-details" className="hover:text-purple-300 transition-colors">Setup Guides</a>
            <a href="#failover" className="hover:text-purple-300 transition-colors">503 Auto-Failover</a>
            <a href="#hotkeys" className="hover:text-purple-300 transition-colors">Hotkeys</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Console</span>
            </Link>
            <a
              href="/downloads/Translucent.msix"
              download="Translucent.msix"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-950/40 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero / Introduction ─── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold mb-3">
          <BookOpen className="w-4 h-4" />
          <span>DOCUMENTATION &amp; KNOWLEDGE BASE</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Multi-Provider AI Engine &amp; API Key Management
        </h1>
        <p className="mt-4 text-base text-zinc-300 max-w-3xl leading-relaxed">
          Translucent features a universal streaming AI dispatcher that seamlessly connects to Google Gemini, Groq, OpenAI, DeepSeek, OpenRouter, and local Ollama instances. You can configure and switch models on the fly with per-provider key retention.
        </p>

        {/* Feature Badges */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300">
            <Key className="w-3.5 h-3.5" /> Dedicated Per-Provider Key Memory
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
            <RefreshCw className="w-3.5 h-3.5" /> Auto 503 Spike Failover
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300">
            <Zap className="w-3.5 h-3.5" /> 1-Click Model Suggestion Chips
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-xs font-semibold text-zinc-300">
            <Laptop className="w-3.5 h-3.5" /> 100% Offline Ollama Compatible
          </div>
        </div>
      </div>

      {/* ─── Comparison Matrix Table ─── */}
      <section id="quick-table" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl border border-white/[0.08] bg-[#121217]/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Supported AI Providers &amp; Key Endpoints
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Direct links to developer portals and recommended model identifiers for each engine.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06] self-start sm:self-auto">
              Updated for v1.0.6+
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">AI Provider</th>
                  <th className="py-3 px-4">Default &amp; Recommended Models</th>
                  <th className="py-3 px-4">Direct Key Link</th>
                  <th className="py-3 px-4">Speed &amp; Latency</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {PROVIDERS.map((provider) => (
                  <tr
                    key={provider.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      selectedProvider === provider.id ? 'bg-purple-500/[0.06]' : ''
                    }`}
                  >
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold">{provider.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${provider.badgeColor}`}>
                          {provider.badge}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-zinc-300">
                      <div className="flex flex-wrap gap-1.5">
                        {provider.models.map((m, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              m === provider.defaultModel
                                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 font-bold'
                                : 'bg-white/[0.04] text-zinc-400'
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <a
                        href={provider.keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4 decoration-purple-500/40 hover:decoration-purple-400"
                      >
                        <span>{provider.keyUrl.replace('https://', '')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>

                    <td className="py-4 px-4 text-zinc-300 font-medium">
                      {provider.latency}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedProvider === provider.id
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                            : 'bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.1]'
                        }`}
                      >
                        View Setup
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Interactive Provider Details & Setup Guide ─── */}
      <section id="provider-details" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Provider Sidebar Selector */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 mb-3">
              Select AI Engine
            </h3>
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedProvider === provider.id
                    ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-purple-500/40 text-white shadow-lg shadow-purple-950/20'
                    : 'bg-[#121217]/50 border-white/[0.06] text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{provider.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{provider.defaultModel}</div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedProvider === provider.id ? 'text-purple-400 translate-x-1' : 'text-zinc-500'}`} />
              </button>
            ))}
          </div>

          {/* Active Provider Details Card */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-white/[0.08] bg-[#121217]/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-extrabold text-white">{currentProvider.name}</h3>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${currentProvider.badgeColor}`}>
                      {currentProvider.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xl">{currentProvider.description}</p>
                </div>

                <a
                  href={currentProvider.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-950/40 transition-all hover:scale-105"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Get API Key ↗</span>
                </a>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Context Window</span>
                  <span className="text-xs font-bold text-white mt-1 block">{currentProvider.contextWindow}</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Free Tier Policy</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block">{currentProvider.freeTier}</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Key Format</span>
                  <span className="text-xs font-mono text-purple-300 mt-1 block">{currentProvider.keyPrefix}</span>
                </div>
              </div>

              {/* Recommended For */}
              <div className="rounded-xl bg-purple-500/[0.08] border border-purple-500/20 p-4 mb-6 text-xs text-purple-200">
                <span className="font-bold text-purple-300 uppercase tracking-wide text-[10px] block mb-1">
                  💡 Best Use Case
                </span>
                {currentProvider.recommendedFor}
              </div>

              {/* Step-by-Step Setup */}
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Setup Steps in Translucent
              </h4>

              <div className="space-y-3 mb-6">
                {currentProvider.setupSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              {/* Model Selection Chips Showcase */}
              <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold text-white">Available Model Chips for {currentProvider.name}:</span>
                  <span className="text-[11px] text-zinc-500">Tap chip in Settings to apply instantly</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentProvider.models.map((model, i) => (
                    <button
                      key={i}
                      onClick={() => handleCopy(model, `model-${model}`)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25252A] hover:bg-[#3F3F46] border border-white/[0.08] text-xs font-mono text-zinc-200 hover:text-white transition-all"
                      title="Click to copy model name"
                    >
                      <span>{model}</span>
                      {copiedKey === `model-${model}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 503 Auto-Failover Explained ─── */}
      <section id="failover" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-[#121217] to-[#121217] p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20 mb-3">
                <RefreshCw className="w-3.5 h-3.5" />
                AUTOMATED ZERO-DROPOUT INTELLIGENCE
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                How Translucent Handles Gemini 503 High Demand Spikes
              </h2>
              <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                When Google's public endpoints return <code className="text-amber-300 font-mono">503 ServiceUnavailable ("model experiencing high demand")</code> or <code className="text-amber-300 font-mono">429 RateLimit</code> on <code className="text-purple-300 font-mono">gemini-3.8-flash</code>, Translucent automatically re-routes the prompt to <code className="text-emerald-300 font-mono">gemini-2.5-flash</code> in milliseconds.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Zero prompt loss or retyping
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Instant fallback to fastest standby model
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Seamless Groq switch recommendation
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-5 font-mono text-xs text-zinc-300 max-w-sm shrink-0">
              <div className="text-[11px] text-zinc-500 mb-2">// In-App Auto-Fallback Output</div>
              <div className="text-amber-400 font-semibold mb-1">
                *[Note: gemini-3.8-flash temporarily busy (503). Auto-switching to gemini-2.5-flash]*
              </div>
              <div className="text-zinc-300">
                Here is the completed solution for your question...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Hotkeys Cheatsheet ─── */}
      <section id="hotkeys" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-16">
        <div className="text-center mb-10">
          <h2 className="text-xs uppercase tracking-widest font-bold text-purple-400 mb-2">QUICK REFERENCE</h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">Essential Stealth Hotkeys</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/70 p-5">
            <span className="text-xs font-bold text-purple-400 block mb-2 font-mono">Ctrl + Shift + Space</span>
            <h4 className="text-sm font-bold text-white mb-1">Global Vanish / Toggle</h4>
            <p className="text-xs text-zinc-400">Instantly shows or hides the entire Translucent desktop overlay from any app or game.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/70 p-5">
            <span className="text-xs font-bold text-purple-400 block mb-2 font-mono">Ctrl + Shift + S</span>
            <h4 className="text-sm font-bold text-white mb-1">Stealth Screen Snip</h4>
            <p className="text-xs text-zinc-400">Select any region on screen to send directly to Gemini or GPT-4o vision for instant analysis.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/70 p-5">
            <span className="text-xs font-bold text-purple-400 block mb-2 font-mono">Ctrl + Shift + G</span>
            <h4 className="text-sm font-bold text-white mb-1">Ghost Stealth Mode</h4>
            <p className="text-xs text-zinc-400">Hides the window from OBS, Zoom, Teams, Discord, and Google Meet screen shares.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/70 p-5">
            <span className="text-xs font-bold text-purple-400 block mb-2 font-mono">Ctrl + Shift + D</span>
            <h4 className="text-sm font-bold text-white mb-1">Dual Split View</h4>
            <p className="text-xs text-zinc-400">Locks the stealth browser tab alongside the AI assistant side-by-side.</p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#070709] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              ⚡
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Translucent Technologies</p>
              <p className="text-[11px] text-zinc-500">© 2026 Translucent. All rights reserved.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <a href="/downloads/Translucent.msix" className="hover:text-white transition-colors" download="Translucent.msix">
              Store Package (.msix)
            </a>
            <a href="/downloads/Translucent.exe" className="hover:text-white transition-colors" download="Translucent.exe">
              Standalone (.exe)
            </a>
            <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
              Admin Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
