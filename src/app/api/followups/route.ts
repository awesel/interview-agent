import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";

type PostBody = {
  question?: string;
  answer?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { question, answer } = (await req.json().catch(() => ({}))) as PostBody;
    if (!question || !answer) {
      return NextResponse.json(
        { error: "question and answer are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Load and render templates from prompts folder
    const base = path.join(process.cwd(), "prompts", "followups");
    const [systemTemplate, userTemplate] = await Promise.all([
      fs.readFile(path.join(base, "system.txt"), "utf8"),
      fs.readFile(path.join(base, "user.txt"), "utf8"),
    ]);
    const userPrompt = renderTemplate(userTemplate, { question, answer });

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 256,
      temperature: 0,
      system: systemTemplate,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const text = (message.content || [])
      .map((b) => (typeof b?.text === "string" ? b.text : ""))
      .join("")
      .trim();

    if (/^no$/i.test(text)) {
      return NextResponse.json({ followups: [] });
    }

    const labelRegex = /^(?:agent|interviewer|intro|follow[-\s]?up|question)\s*:\s*/i;
    const bulletRegex = /^(?:[-*•\d]+[\.)\]]?\s*)/;
    function normalizeFollowup(s: string): string | undefined {
      let t = s.trim();
      // strip surrounding quotes
      t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
      // strip bullets/numbers
      t = t.replace(bulletRegex, "");
      // strip role/section labels
      t = t.replace(labelRegex, "");
      // collapse extra spaces
      t = t.replace(/\s+/g, " ").trim();
      if (!t) return undefined;
      // ensure trailing question mark
      if (!/[?]$/.test(t)) {
        t = t.replace(/[\.!]+$/, "");
        t += "?";
      }
      return t;
    }

    const followups = text
      .split(",")
      .map((s) => normalizeFollowup(s))
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 3);

    return NextResponse.json({ followups });
  } catch (err) {
    return NextResponse.json({ error: "followups failed" }, { status: 500 });
  }
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const val = vars[key];
    return typeof val === "string" ? val : "";
  });
}


