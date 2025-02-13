
const API_KEY = "AIzaSyAxbXjO0yTziA1ZJCu1I9833cZPcYZNUHo";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateResponse(message: string, file?: File) {
  try {
    const parts: any[] = [{ text: message }];

    if (file) {
      if (file.type.startsWith('image/')) {
        const base64Data = await convertFileToBase64(file);
        parts.push({
          inline_data: {
            mime_type: file.type,
            data: base64Data
          }
        });
      } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
        const text = await file.text();
        parts.push({ text: `\nFile contents:\n${text}` });
      }
    }

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts
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
