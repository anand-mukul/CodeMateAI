"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Send,
  Cpu,
  Zap,
  Layers,
  Code2,
  Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 1. Model Selector Badge
export function ModelBadge({
  model = "gemini-2.5-flash",
  latency = "118ms",
}: {
  model?: string;
  latency?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-zinc-200 capitalize">{model.replace("-", " ")}</span>
      <span className="text-zinc-500">|</span>
      <span className="text-indigo-400">{latency}</span>
    </div>
  );
}

// 2. Expandable AI Reasoning Element (Chain of Thought)
export function ReasoningProcess({
  steps = [
    "Parsed competitive problem constraints: N <= 2e5, time limit 1.0s.",
    "Formulated topological segment tree with lazy propagation for point updates.",
    "Verified edge cases: negative weights, disjoint tree partitions, null query intervals.",
    "Generated indentation-safe Monaco injection buffer with zero-keystroke synthesis.",
  ],
}: {
  steps?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/40 overflow-hidden text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-zinc-300 hover:text-white hover:bg-white/[0.02] transition cursor-pointer"
      >
        <div className="flex items-center gap-2 font-mono">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-zinc-200">AI Reasoning Process</span>
          <span className="text-[10px] text-zinc-500">({steps.length} cognitive stages)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {open && (
        <div className="p-4 pt-1 space-y-2 border-t border-white/[0.06] bg-black/30 font-mono text-[11px] text-zinc-400">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 3. Indentation-Safe Code Preview Element
export function CodeBlockPreview({
  language = "java",
  code,
  fileName = "Solution.java",
}: {
  language?: string;
  code: string;
  fileName?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/60 overflow-hidden text-xs font-mono shadow-md">
      <div className="h-9 px-4 bg-zinc-900/80 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{fileName}</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1 border-white/10 uppercase">
            {language}
          </Badge>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Buffer"}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto text-zinc-300 space-y-0.5">
        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-4">
            <span className="w-6 text-right text-zinc-600 select-none text-[10px]">{idx + 1}</span>
            <span className="whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Interactive AI Workspace Playground
export function AIWorkspacePlayground() {
  const sampleCode = `import java.io.*;
import java.util.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // O(N log N) Segment Tree Implementation
        int n = Integer.parseInt(br.readLine().trim());
        long[] tree = new long[4 * n];
        System.out.println("Optimal synthesis verified.");
    }
}`;

  return (
    <Card className="bg-zinc-950/80 border-white/[0.08]">
      <CardHeader className="pb-4 border-b border-white/[0.06] flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Code Synthesizer</span>
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">
            Test prompt comprehension and zero-keystroke Monaco editor buffer synthesis
          </p>
        </div>
        <ModelBadge model="Gemini 2.5 Flash" latency="118ms" />
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <ReasoningProcess />
        <CodeBlockPreview code={sampleCode} language="java" fileName="Solution.java" />
      </CardContent>
    </Card>
  );
}

