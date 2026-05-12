export interface SiteAdapter {
  name: string
  match: (url: string) => boolean
  getTextarea: () => HTMLTextAreaElement | HTMLDivElement | null
  getSendButton: () => HTMLElement | null
  getMessages: () => string[]
}

export const adapters: SiteAdapter[] = [
  {
    name: "ChatGPT",
    match: (url) => url.includes("chatgpt.com") || url.includes("chat.openai.com"),
    getTextarea: () =>
      (document.querySelector("#prompt-textarea") ??
       document.querySelector("textarea[placeholder]")) as HTMLTextAreaElement | null,
    getSendButton: () => document.querySelector('button[data-testid="send-button"]'),
    getMessages: () =>
      Array.from(document.querySelectorAll('[data-message-author-role="user"]'))
        .map(el => el.textContent ?? ""),
  },
  {
    name: "Claude",
    match: (url) => url.includes("claude.ai"),
    getTextarea: () =>
      (document.querySelector('div[contenteditable="true"].ProseMirror') ??
       document.querySelector('div[contenteditable="true"]')) as HTMLDivElement | null,
    getSendButton: () =>
      document.querySelector('button[aria-label="Send Message"]') ??
      document.querySelector('button[type="submit"]'),
    getMessages: () =>
      Array.from(document.querySelectorAll('.font-claude-message, [data-is-streaming]'))
        .map(el => el.textContent ?? ""),
  },
  {
    name: "Gemini",
    match: (url) => url.includes("gemini.google.com"),
    getTextarea: () =>
      (document.querySelector('div[contenteditable="true"].ql-editor') ??
       document.querySelector('rich-textarea div[contenteditable="true"]')) as HTMLDivElement | null,
    getSendButton: () =>
      document.querySelector('button.send-button') ??
      document.querySelector('button[aria-label="Send message"]'),
    getMessages: () =>
      Array.from(document.querySelectorAll('.user-query-text'))
        .map(el => el.textContent ?? ""),
  },
  {
    name: "DeepSeek",
    match: (url) => url.includes("chat.deepseek.com"),
    getTextarea: () =>
      (document.querySelector('textarea#chat-input') ??
       document.querySelector('textarea')) as HTMLTextAreaElement | null,
    getSendButton: () =>
      document.querySelector('button[aria-label="send"]') ??
      document.querySelector('div[role="button"][class*="send"]'),
    getMessages: () =>
      Array.from(document.querySelectorAll('[class*="userMessage"], [class*="user-message"]'))
        .map(el => el.textContent ?? ""),
  },
  {
    name: "Perplexity",
    match: (url) => url.includes("perplexity.ai"),
    getTextarea: () =>
      (document.querySelector('textarea[placeholder*="Ask"]') ??
       document.querySelector('textarea')) as HTMLTextAreaElement | null,
    getSendButton: () => document.querySelector('button[aria-label="Submit"]'),
    getMessages: () =>
      Array.from(document.querySelectorAll('[class*="userMessage"]'))
        .map(el => el.textContent ?? ""),
  },
]

export const findAdapter = (url: string): SiteAdapter | undefined =>
  adapters.find(a => a.match(url))
