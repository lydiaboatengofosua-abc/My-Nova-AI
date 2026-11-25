
export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Use POST to send a message." },
      { status: 405 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is missing. Check your .env file." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const message = body.message;
    const style = body.style;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return Response.json(
        { error: "Please keep your message under 4,000 characters." },
        { status: 400 }
      );
    }

    const styles = {
      simple: "Explain things simply and step by step.",
      detailed: "Give detailed explanations and examples.",
      creative: "Be creative, engaging, and playful.",
      direct: "Be concise, clear, and direct."
    };

    const history = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    const contents = history
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content.slice(0, 4000) }]
      }));

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "You are NOVA, a helpful personal AI assistant. " +
                (styles[style] || styles.simple) +
                " Help people learn, plan, create, and solve problems."
            }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 600
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data.error?.message);

      return Response.json(
        {
          error:
            response.status === 429
              ? "NOVA has reached the API usage limit. Please try again later."
              : "Gemini could not process the request. Check your API key and API access."
        },
        { status: 502 }
      );
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return Response.json(
        { error: "NOVA received an empty reply. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("NOVA backend error:", error.message);

    return Response.json(
      { error: "Something went wrong while processing your message." },
      { status: 500 }
    );
  }
}

