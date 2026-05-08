export interface SiteAdapter {
  name: string;
  match: (url: string) => boolean;
  getTextarea: () => HTMLTextAreaElement | HTMLDivElement | null;
  getSendButton: () => HTMLElement | null;
  getMessages: () => string[];
}

export const adapters: SiteAdapter[] = [
  {
    name: "ChatGPT",
    match: (url) => url.includes("chatgpt.com") || url.includes("chat.openai.com"),
    getTextarea: () => document.querySelector("#prompt-textarea") as HTMLTextAreaElement,
    getSendButton: () => document.querySelector('button[data-testid="send-button"]'),
    getMessages: () => Array.from(document.querySelectorAll('.message-content')).map(el => el.textContent || "")
  },
  {
    name: "Claude",
    match: (url) => url.includes("claude.ai"),
    getTextarea: () => document.querySelector('div[contenteditable="true"]') as HTMLDivElement,
    getSendButton: () => document.querySelector('button[aria-label="Send Message"]'),
    getMessages: () => Array.from(document.querySelectorAll('.font-claude-message')).map(el => el.textContent || "")
  }
];

export const findAdapter = (url: string) => adapters.find(a => a.match(url));
