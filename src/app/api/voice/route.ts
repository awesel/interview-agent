import { NextRequest, NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    
    if (action === "create-conversation") {
      const response = await fetch(`${FASTAPI_BASE_URL}/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (action === "transcribe") {
      const conversationId = searchParams.get("conversationId");
      if (!conversationId) {
        return NextResponse.json({ error: "conversationId required" }, { status: 400 });
      }
      
      const formData = await request.formData();
      
      const response = await fetch(`${FASTAPI_BASE_URL}/conversation/${conversationId}/transcribe`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (action === "speak") {
      const conversationId = searchParams.get("conversationId");
      if (!conversationId) {
        return NextResponse.json({ error: "conversationId required" }, { status: 400 });
      }
      
      const { text } = await request.json();
      if (!text) {
        return NextResponse.json({ error: "text required" }, { status: 400 });
      }
      
      const response = await fetch(`${FASTAPI_BASE_URL}/conversation/${conversationId}/speak?text=${encodeURIComponent(text)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    
  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }
    
    const response = await fetch(`${FASTAPI_BASE_URL}/audio/${messageId}`);
    
    if (!response.ok) {
      throw new Error(`FastAPI error: ${response.status}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=3600",
      },
    });
    
  } catch (error) {
    console.error("Audio fetch error:", error);
    return NextResponse.json(
      { error: "Audio not found" },
      { status: 404 }
    );
  }
}