import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";
import fetch from "node-fetch"; // Asegúrate de tenerlo en tu package.json

const app = express();

// 1. Configuración de CORS para Canva
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const FILE_PATH = "data.json";

// Crear archivo si no existe
if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

// 🌐 RUTA DE INICIO
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
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al leer datos" });
  }
});

// 🤖 EVALUAR CON IA (Corregido)
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
            content: "Eres un experto en educación inicial y pedagogía. Evalúa la respuesta del estudiante de forma constructiva. Estructura tu respuesta con: Fortalezas, Oportunidades de mejora, Recomendación y Puntaje (1 a 5)."
          },
          {
            role: "user",
            content: `Pregunta: ${question}\nRespuesta: ${answer}`
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error de OpenAI:", data.error.message);
      return res.json({ feedback: "Error en la configuración de la IA" });
    }

    const aiFeedback = data.choices?.[0]?.message?.content || "Sin respuesta";

    res.json({
      feedback: aiFeedback
    });

  } catch (error) {
    console.error("Error en /evaluate:", error);
    res.json({ feedback: "Error al conectar con el servidor de IA" });
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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Informe_Evaluacion_${studentName}.pdf`
    );

    doc.pipe(res);

    // Diseño del PDF
    doc.fontSize(20).fillColor('#2c3e50').text("Informe de Evaluación Genius", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).fillColor('black').text(`Estudiante: ${studentName}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    if (filteredResults.length === 0) {
      doc.text("No hay resultados registrados para este estudiante.");
    } else {
      filteredResults.forEach((item, index) => {
        doc.fontSize(14).fillColor('#16a085').text(`Situación ${index + 1}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('black').text(`Pregunta:`, { oblique: true });
        doc.text(item.question || "N/A");
        doc.moveDown(0.5);
        doc.text(`Respuesta:`, { oblique: true });
        doc.text(item.answer || "Sin respuesta");
        doc.moveDown(0.5);
        doc.text(`Retroalimentación de la IA:`, { oblique: true });
        doc.text(item.feedback || "Sin feedback");
        doc.moveDown(1.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error PDF:", error);
    res.status(500).send("Error al generar el PDF");
  }
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
