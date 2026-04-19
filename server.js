import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";

const app = express();

// Configuración de CORS robusta
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const FILE_PATH = "data.json";
if (!fs.existsSync(FILE_PATH)) { fs.writeFileSync(FILE_PATH, JSON.stringify([])); }

app.get('/', (req, res) => res.send('Servidor Genius Activo ✅'));

// 🤖 EVALUAR CON IA (VERSIÓN FINAL GARANTIZADA)
app.post("/evaluate", async (req, res) => {
  // Extraemos datos. Si question o answer vienen vacíos de Canva, usamos valores por defecto
  const question = req.body.question || "Pregunta general";
  const answer = req.body.answer || "Sin respuesta";

  console.log("Recibido de Canva:", { question, answer }); // Esto aparecerá en tus logs de Render

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

    // Si OpenAI devuelve error (ej. sin saldo o clave mal puesta)
    if (data.error) {
      console.error("Error de OpenAI:", data.error.message);
      return res.json({ feedback: "Error de API: " + data.error.message });
    }

    // Acceso ultra seguro a la respuesta
    if (data.choices && data.choices.length > 0) {
      const aiFeedback = data.choices[0].message.content;
      return res.json({ feedback: aiFeedback });
    } else {
      return res.json({ feedback: "La IA no devolvió resultados." });
    }

  } catch (error) {
    console.error("Error fatal en servidor:", error);
    res.json({ feedback: "No se pudo conectar con la IA. Revisa los logs." });
  }
});

app.post("/save", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    data.push({ ...req.body, date: new Date() });
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "Guardado" });
  } catch (e) { res.status(500).json({ error: "Error al guardar" }); }
});

app.get("/generate-pdf", (req, res) => {
  const student = req.query.student || "Estudiante";
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Informe.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text("Informe Genius", { align: "center" }).moveDown();
  doc.fontSize(12).text(`Estudiante: ${student}`).moveDown();
  doc.end();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
