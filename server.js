import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";

const app = express();

// 1. Configuración de CORS para Canva
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const FILE_PATH = "data.json";

if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

app.get('/', (req, res) => {
  res.send('Servidor de Evaluación Genius Activo ✅');
});

// 🧠 GUARDAR RESPUESTA
app.post("/save", (req, res) => {
  try {
    const newData = req.body;
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    data.push({ ...newData, date: new Date() });
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "Guardado correctamente" });
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ error: "Error al guardar los datos" });
  }
});

app.get("/results", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al leer datos" });
  }
});

// 🤖 EVALUAR CON IA (Línea de respuesta corregida)
app.post("/evaluate", async (req, res) => {
  const { question, answer } = req.body;

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
          {
            role: "system",
            content: "Eres un experto en educación inicial. Evalúa de forma constructiva con: Fortalezas, Oportunidades de mejora, Recomendación y Puntaje (1-5)."
          },
          { role: "user", content: `Pregunta: ${question}\nRespuesta: ${answer}` }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error de OpenAI:", data.error.message);
      return res.json({ feedback: "Error: " + data.error.message });
    }

    // CORRECCIÓN AQUÍ: Acceso limpio a la respuesta
    const aiFeedback = data.choices?.[0]?.message?.content || "No se obtuvo respuesta de la IA.";

    res.json({ feedback: aiFeedback });

  } catch (error) {
    console.error("Error en /evaluate:", error);
    res.json({ feedback: "Error de conexión con el servicio de IA." });
  }
});

// 📄 GENERAR PDF
app.get("/generate-pdf", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    const studentName = req.query.student || "Estudiante";
    const filteredResults = data.filter(item => item.studentName === studentName);

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Informe_${studentName}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("Informe de Evaluación Genius", { align: "center" });
    doc.moveDown().fontSize(12).text(`Estudiante: ${studentName}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`).moveDown();

    if (filteredResults.length === 0) {
      doc.text("No hay registros para este estudiante.");
    } else {
      filteredResults.forEach((item, index) => {
        doc.fontSize(14).text(`Evaluación ${index + 1}`, { underline: true }).moveDown(0.5);
        doc.fontSize(11).text(`Pregunta: ${item.question}`);
        doc.text(`Respuesta: ${item.answer}`);
        doc.text(`Feedback: ${item.feedback}`).moveDown();
      });
    }
    doc.end();
  } catch (error) {
    res.status(500).send("Error al generar PDF");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
