import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type PostBody = {
  question: string;
  context: { type: 'question'|'participant'; key: string; quotes: string[] };
};

export async function POST(req: NextRequest){
  try{
    const body = (await req.json()) as Partial<PostBody>;
    const question = (body?.question||'').toString();
    const ctx = body?.context as PostBody['context'] | undefined;
    if(!question || !ctx || !Array.isArray(ctx.quotes)){
      return NextResponse.json({ error: 'question and context.quotes are required' },{ status:400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if(!apiKey){
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const system = [
      'You are an analyst helping interpret survey/interview responses.',
      'Use the provided direct quotations as primary evidence. Cite short quotes in-line with quotes like "...".',
      'Be concise, structured, and avoid fabricating content beyond quotes. If insufficient evidence, say so.',
    ].join('\n');

    const user = [
      `Question: ${question}`,
      `Context Type: ${ctx.type}`,
      `Context Key: ${ctx.key}`,
      'Direct quotations (verbatim, may include duplicates):',
      ...ctx.quotes.map((q,i)=>`- "${q.replace(/"/g,'\"')}"`),
      '',
      'Instructions:',
      '- Answer directly and succinctly.',
      '- When making claims, cite 1-3 short quotes verbatim as evidence.',
      '- Do not include any preamble like "Analysis:"; just answer.',
    ].join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 400,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text = message.content
      .map((block) => {
        if (block.type === 'text') {
          return block.text;
        }
        return '';
      })
      .join('')
      .trim();

    return NextResponse.json({ text });
  }catch(err){
    return NextResponse.json({ error: 'results-chat failed' }, { status: 500 });
  }
}


