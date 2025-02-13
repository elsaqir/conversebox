
const API_KEY = "AIzaSyAxbXjO0yTziA1ZJCu1I9833cZPcYZNUHo";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function generateResponse(message: string) {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate response");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
}
