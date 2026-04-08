import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/evaluate", async (req, res) => {
  const { question, answer } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un experto en educación inicial, pedagogía y desarrollo infantil. Evalúas respuestas con claridad, empatía y enfoque formativo."
          },
          {
            role: "user",
            content: `
Pregunta:
${question}

Respuesta del estudiante:
${answer}

Evalúa la respuesta con este formato:

Fortalezas:
- ...

Oportunidades de mejora:
- ...

Retroalimentación pedagógica:
...

Puntaje (1 a 5):
`
          }
        ]
      })
    });

    const data = await response.json();

    console.log("Respuesta completa de OpenAI:", JSON.stringify(data, null, 2));

    if (data.error) {
      return res.json({
        feedback: "Error de OpenAI: " + data.error.message
      });
    }

    if (!data.choices || !data.choices.length) {
      return res.json({
        feedback: "No se recibió respuesta válida de la IA"
      });
    }

    res.json({
      feedback: data.choices[0].message.content
    });

  } catch (error) {
    console.error("ERROR:", error);

    res.json({
      feedback: "Error al conectar con la IA. Verifica API Key o conexión."
    });
  }
});

app.listen(3000, () => console.log("Servidor corriendo"));
