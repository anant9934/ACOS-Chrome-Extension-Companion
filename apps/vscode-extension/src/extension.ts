import * as vscode from "vscode";
import { compressText, pruneCode, ContextRelevanceEngine, CREInput, ContextPacketCompiler, type CPCInput, AdaptiveContextIntelligenceSystem, type ACISInput, AutonomousContextOperatingSystem, type ACOSOutput } from "@repo/core";

export function activate(context: vscode.ExtensionContext) {
  console.log("AI Context Optimizer is now active");

  // Command: Optimize Context (Legacy)
  let optimizeContext = vscode.commands.registerCommand(
    "ai-context-optimizer.optimizeContext",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const selection = editor.selection;
      const text = selection.isEmpty 
        ? editor.document.getText() 
        : editor.document.getText(selection);

      const optimized = pruneCode(text);
      
      vscode.env.clipboard.writeText(optimized).then(() => {
        vscode.window.showInformationMessage("Optimized context copied to clipboard! ✨");
      });
    }
  );

  // Command: Analyze Relevance (CRE)
  let analyzeRelevance = vscode.commands.registerCommand(
    "ai-context-optimizer.analyzeRelevance",
    async () => {
      const cre = new ContextRelevanceEngine();
      const editor = vscode.window.activeTextEditor;
      
      const input: CREInput = {
        activeFile: editor?.document.fileName,
        cursorPosition: editor ? {
          line: editor.selection.active.line,
          character: editor.selection.active.character
        } : undefined,
        prompt: await vscode.window.showInputBox({ prompt: "What are you trying to do?" })
      };

      const packet = await cre.process(input);
      
      vscode.window.showInformationMessage(
        `CRE: Identified ${packet.primaryFiles.length} primary files. Confidence: ${packet.confidenceScore}`
      );

      // Open a virtual document or update sidebar with the packet
      console.log("Context Packet:", packet);
    }
  );

  // Command: Compile Packet (CPC)
  let compilePacket = vscode.commands.registerCommand(
    "ai-context-optimizer.compilePacket",
    async () => {
      const cre = new ContextRelevanceEngine();
      const cpc = new ContextPacketCompiler();
      const editor = vscode.window.activeTextEditor;
      
      const prompt = await vscode.window.showInputBox({ prompt: "Describe your task for context compilation" });
      if (!prompt) return;

      const input: CREInput = {
        activeFile: editor?.document.fileName,
        prompt
      };

      const crePacket = await cre.process(input);
      const cpcInput: CPCInput = {
        crePacket,
        userPrompt: prompt,
        tokenBudget: 4000 // Default budget
      };

      const finalPacket = await cpc.compile(cpcInput);
      
      vscode.window.showInformationMessage(
        `CPC: Compiled packet with ${finalPacket.estimatedTokens} tokens. Risk: ${finalPacket.hallucinationRisk.score}`
      );

      console.log("Final Context Packet:", finalPacket);
    }
  );

  // Command: Generate Adaptive Context (ACIS)
  let generateAdaptiveContext = vscode.commands.registerCommand(
    "ai-context-optimizer.generateAdaptiveContext",
    async () => {
      const cre = new ContextRelevanceEngine();
      const cpc = new ContextPacketCompiler();
      const acis = new AdaptiveContextIntelligenceSystem();
      const editor = vscode.window.activeTextEditor;
      
      const prompt = await vscode.window.showInputBox({ prompt: "What is your task?" });
      const model = await vscode.window.showQuickPick(["gpt-4o", "claude-3-sonnet", "gemini-1.5-pro", "ollama-llama3"], { placeHolder: "Select target LLM" });
      
      if (!prompt || !model) return;

      const crePacket = await cre.process({ activeFile: editor?.document.fileName, prompt });
      const cpcPacket = await cpc.compile({ crePacket, userPrompt: prompt, tokenBudget: 4000 });
      
      const acisInput: ACISInput = {
        cpcPacket,
        targetModel: model,
        taskMode: crePacket.taskType
      };

      const result = await acis.adapt(acisInput);
      
      vscode.window.showInformationMessage(
        `ACIS: Strategy - ${result.strategyUsed}. Degradation Risk: ${result.degradationRisk.risk}`
      );

      console.log("Adaptive Result:", result);
    }
  );

  // Command: Launch Context Control Center (ACOS)
  let launchACOS = vscode.commands.registerCommand(
    "ai-context-optimizer.launchACOS",
    async () => {
      const cre = new ContextRelevanceEngine();
      const cpc = new ContextPacketCompiler();
      const acis = new AdaptiveContextIntelligenceSystem();
      const acos = new AutonomousContextOperatingSystem();
      const editor = vscode.window.activeTextEditor;
      
      const prompt = await vscode.window.showInputBox({ prompt: "Autonomous Orchestration: What is the goal?" });
      const model = await vscode.window.showQuickPick(["gpt-4o", "claude-3-sonnet"], { placeHolder: "Select target LLM" });
      
      if (!prompt || !model) return;

      const crePacket = await cre.process({ activeFile: editor?.document.fileName, prompt });
      const cpcPacket = await cpc.compile({ crePacket, userPrompt: prompt, tokenBudget: 4000 });
      
      const result = await acos.orchestrate({
        cpcPacket,
        targetModel: model,
        taskMode: crePacket.taskType
      });
      
      vscode.window.showInformationMessage(
        `ACOS Active: Failure Risk ${Math.round(result.prediction.failureProbability * 100)}%. Bandwidth: ${Math.round(result.cognitiveBandwidth * 100)}%`
      );

      console.log("ACOS Orchestration Result:", result);
    }
  );

  context.subscriptions.push(optimizeContext, analyzeRelevance, compilePacket, generateAdaptiveContext, launchACOS);

  // WebView Provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "ai-context-optimizer-sidebar",
      new ContextBuilderProvider(context.extensionUri)
    )
  );
}

class ContextBuilderProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Context Builder</title>
				<style>
					body { font-family: sans-serif; padding: 10px; color: var(--vscode-foreground); }
					.btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px; cursor: pointer; width: 100%; border-radius: 4px; }
					.btn:hover { background: var(--vscode-button-hoverBackground); }
					.stat { margin-top: 10px; font-size: 0.9em; opacity: 0.8; }
				</style>
			</head>
			<body>
				<h3>⚡ Context Builder</h3>
				<p>Select code in your editor to see optimization stats.</p>
				<button class="btn" id="optimizeBtn">Copy Optimized Context</button>
				<div class="stat" id="status">Ready</div>
				<script>
					const vscode = acquireVsCodeApi();
					document.getElementById('optimizeBtn').addEventListener('click', () => {
						vscode.postMessage({ command: 'optimize' });
					});
				</script>
			</body>
			</html>`;
  }
}

export function deactivate() {}
