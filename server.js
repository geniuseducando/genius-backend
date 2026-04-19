import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const FILE_PATH = "data.json";
if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify([]));

app.get('/', (req, res) => res.send('Servidor Genius Activo ✅'));

// 🤖 EVALUAR CON IA (VERSIÓN FINAL ANTI-ERRORES)
const handleEvaluate = async (req, res) => {
  const { question, answer } = req.body;
  console.log("Conectando con OpenAI...");

  try {
    const apiResponse = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres experto en educación inicial. Evalúa con: Fortalezas, Oportunidades de mejora, Recomendación y Puntaje (1-5)." },
          { role: "user", content: `Pregunta: ${question}\nRespuesta: ${answer}` }
        ]
      })
    });

    // Verificamos si la respuesta es exitosa
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Error de OpenAI (No OK):", errorText);
      return res.json({ choices: [{ message: { content: "Error de API: " + apiResponse.status } }] });
    }

    const data = await apiResponse.json();

    // Acceso directo y seguro al primer resultado
    const aiText = data.choices[0].message.content;
    console.log("¡Respuesta obtenida con éxito!");

    res.json({
      choices: [{ message: { content: aiText } }]
    });

  } catch (error) {
    console.error("Error fatal:", error.message);
    res.json({ choices: [{ message: { content: "Error de conexión: " + error.message } }] });
  }
};

app.post("/evaluate", handleEvaluate);
app.post("/evaluate/", handleEvaluate);

app.post("/save", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    data.push({ ...req.body, date: new Date() });
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "Guardado" });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get("/generate-pdf", (req, res) => {
  const student = req.query.student || "Estudiante";
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Informe.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text("Informe Genius", { align: "center" }).moveDown();
  doc.end();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor iniciado"));
