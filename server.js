import express from "express";
import cors from "cors";
import fs from "fs";
import PDFDocument from "pdfkit";

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
            content:
              "Eres experto en educación inicial y pedagogía. Evalúa respuestas de forma clara, profesional y constructiva."
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
    res.json({
      feedback: "Error con IA"
    });
  }
});

// 📄 GENERAR PDF POR ESTUDIANTE (VERSIÓN PRO)
app.get("/generate-pdf", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE_PATH));

  const studentName = req.query.student || "Estudiante";

  const filteredResults = data.filter(
    item => item.studentName === studentName
  );

  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "inline; filename=Informe_Evaluacion_Genius.pdf"
  );

  doc.pipe(res);

  // Título
  doc.fontSize(18).text("Informe de Evaluación Genius", {
    align: "center",
  });

  doc.moveDown();
  doc.fontSize(12).text(`Estudiante: ${studentName}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`);

  doc.moveDown();

  if (filteredResults.length === 0) {
    doc.text("No hay resultados para este estudiante.");
  } else {
    filteredResults.forEach((item, index) => {
      doc.fontSize(14).text(`Situación ${index + 1}`, {
        underline: true,
      });

      doc.moveDown(0.5);
      doc.fontSize(12).text(`Pregunta: ${item.question || "Sin pregunta"}`);
      doc.moveDown(0.5);
      doc.text(`Respuesta: ${item.answer || "Sin respuesta"}`);
      doc.moveDown(0.5);
      doc.text(`Feedback IA: ${item.feedback || "Sin feedback"}`);

      doc.moveDown();
    });
  }

  doc.end();
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
