import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";
import fetch from "node-fetch"; // Asegúrate de que esta línea coincida con tu versión de node

const app = express();

// 1. Configuración de CORS corregida para Canva
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const FILE_PATH = "data.json";

// Crear archivo si no existe
if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

// 🌐 RUTA DE INICIO (Para que no de error al entrar a la URL)
app.get('/', (req, res) => {
  res.send('Servidor de Evaluación Genius Activo ✅');
});

// 🧠 GUARDAR RESPUESTA
app.post("/save", (req, res) => {
  try {
    const newData = req.body;
    const data = JSON.parse(fs.readFileSync(FILE_PATH));

    data.push({
      ...newData,
      date: new Date()
    });

    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "Guardado correctamente" });
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ error: "Error al guardar los datos" });
  }
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
            content: "Eres experto en educación inicial y pedagogía. Evalúa respuestas de forma clara, profesional y constructiva."
          },
          {
            role: "user",
            content: `Pregunta: ${question}\nRespuesta: ${answer}\n\nEvalúa con:\n- Fortalezas\n- Oportunidades de mejora\n- Recomendación\n- Puntaje (1 a 5)`
          }
        ]
      })
    });

    const data = await response.json();
    res.json({
      feedback: data?.choices?.[0]?.message?.content || "Sin respuesta"
    });

  } catch (error) {
    console.error(error);
    res.json({ feedback: "Error con IA" });
  }
});

// 📄 GENERAR PDF POR ESTUDIANTE
app.get("/generate-pdf", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    const studentName = req.query.student || "Estudiante";

    const filteredResults = data.filter(
      item => item.studentName === studentName
    );

    const doc = new PDFDocument();

    // Configuración para descarga automática
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Informe_Evaluacion_${studentName}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(18).text("Informe de Evaluación Genius", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Estudiante: ${studentName}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    if (filteredResults.length === 0) {
      doc.text("No hay resultados registrados para este nombre.");
    } else {
      filteredResults.forEach((item, index) => {
        doc.fontSize(14).text(`Situación ${index + 1}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Pregunta: ${item.question || "N/A"}`);
        doc.moveDown(0.5);
        doc.text(`Respuesta: ${item.answer || "Sin respuesta"}`);
        doc.moveDown(0.5);
        doc.text(`Feedback IA: ${item.feedback || "Sin feedback"}`);
        doc.moveDown();
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error PDF:", error);
    res.status(500).send("Error al generar el PDF");
  }
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 10000; // Render prefiere el puerto 10000
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
