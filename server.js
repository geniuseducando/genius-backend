import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const FILE_PATH = "data.json";
if (!fs.existsSync(FILE_PATH)) { fs.writeFileSync(FILE_PATH, JSON.stringify([])); }

app.get('/', (req, res) => res.send('Servidor Genius Activo ✅'));

// 🤖 EVALUAR CON IA (VERSIÓN FINAL DEFINITIVA)
const handleEvaluate = async (req, res) => {
  const { question, answer } = req.body;
  console.log("Enviando a OpenAI...");

  try {
    const response = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", 
        messages: [
          { role: "system", content: "Eres experto en educación inicial. Evalúa con: Fortalezas, Oportunidades de mejora, Recomendación y Puntaje (1-5)." },
          { role: "user", content: `Pregunta: ${question}\nRespuesta: ${answer}` }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error de OpenAI:", data.error.message);
      return res.json({ choices: [{ message: { content: "Error de IA: " + data.error.message } }] });
    }

    // Ruta corregida: data.choices[0].message.content
    const aiText = data.choices[0].message.content;
    
    // Enviamos exactamente lo que tu código de Canva espera
    res.json({
      choices: [
        {
          message: {
            content: aiText
          }
        }
      ]
    });

  } catch (error) {
    console.error("Error en el proceso:", error);
    res.json({ choices: [{ message: { content: "Error de conexión con la IA." } }] });
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
  doc.text(`Estudiante: ${student}`).moveDown();
  doc.end();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor iniciado"));
