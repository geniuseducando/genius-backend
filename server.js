import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const FILE_PATH = "data.json";

// Crear archivo si no existe
if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

// 🧠 GUARDAR RESPUESTA
app.post("/save", (req, res) => {
  const newData = req.body;

  const data = JSON.parse(fs.readFileSync(FILE_PATH));
  data.push({
    ...newData,
    date: new Date()
  });

  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));

  res.json({ message: "Guardado correctamente" });
});

// 📊 OBTENER RESULTADOS
app.get("/results", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE_PATH));
  res.json(data);
});

// 🤖 EVALUAR CON IA
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
            content: "Eres experto en educación inicial y pedagogía."
          },
          {
            role: "user",
            content: `Pregunta: ${question}\nRespuesta: ${answer}\nEvalúa con fortalezas, mejoras y puntaje.`
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      feedback: data?.choices?.[0]?.message?.content || "Sin respuesta"
    });

  } catch (error) {
    res.json({
      feedback: "Error con IA"
    });
  }
});

app.listen(3000, () => console.log("Servidor con BD corriendo"));
