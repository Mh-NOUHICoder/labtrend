import { NextResponse } from "next/server";

export async function GET() {
  const result: any = {
    groq: { status: "checking", models: [] },
    gemini: { status: "checking", models: [] },
    openai: { status: "checking", models: [] }
  };

  // 1. Fetch Groq Models
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` }
      });
      const data = await res.json();
      if (data.data) {
        result.groq.status = "connected";
        result.groq.models = data.data.map((m: any) => m.id);
      } else {
        result.groq.status = "error: " + JSON.stringify(data);
      }
    } else {
      result.groq.status = "missing key";
    }
  } catch (e: any) {
    result.groq.status = `error: ${e.message}`;
  }

  // 2. Fetch Gemini Models
  try {
    const geminiKey = process.env.GEMENI_API_KEY || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const data = await res.json();
      if (data.models) {
        result.gemini.status = "connected";
        result.gemini.models = data.models.map((m: any) => m.name);
      } else {
        result.gemini.status = "error: " + JSON.stringify(data);
      }
    } else {
      result.gemini.status = "missing key";
    }
  } catch (e: any) {
    result.gemini.status = `error: ${e.message}`;
  }

  // 3. Fetch OpenAI Models
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== "your_openai_api_key_here") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` }
      });
      const data = await res.json();
      if (data.data) {
        result.openai.status = "connected";
        result.openai.models = data.data.map((m: any) => m.id);
      } else {
        result.openai.status = "error: " + JSON.stringify(data);
      }
    } else {
      result.openai.status = "missing key";
    }
  } catch (e: any) {
    result.openai.status = `error: ${e.message}`;
  }

  return NextResponse.json(result);
}
