// -----------------------------------------------------------------
// CONFIGURACIÓN Y CONSTANTES
// -----------------------------------------------------------------

// URL de MockAPI donde está almacenada la API key
const MOCKAPI_URL = "https://690a3d841a446bb9cc21e984.mockapi.io/apiKeyOpenAI";

// -----------------------------------------------------------------
// EVENT LISTENER: BOTÓN DE EVALUAR
// -----------------------------------------------------------------

btnEvaluate.addEventListener("click", async () => {
  const operation = operationInput.value.trim();
  if (!operation) {
    statusMessage.textContent = "Escribe una operación primero.";
    statusMessage.classList.remove("text-muted");
    statusMessage.classList.add("text-danger");
    return;
  }

  statusMessage.textContent = "Consultando OpenAI...";
  statusMessage.classList.remove("text-danger");
  statusMessage.classList.add("text-muted");

  resultValue.innerHTML = '<span class="text-muted">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Calculando…</span>';

  try {
    // 1️⃣ Obtener la API key desde MockAPI
    const keyResponse = await fetch(MOCKAPI_URL);
    if (!keyResponse.ok) throw new Error(`Error al obtener la API key: ${keyResponse.status}`);
    const keyData = await keyResponse.json();
    if (!keyData || !keyData[0]?.apiKey) throw new Error("No se encontró la API key en MockAPI");
    const OPENAI_API_KEY = keyData[0].apiKey;

    // 2️⃣ Llamada a OpenAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
          Eres una calculadora matemática.
          Debes evaluar la siguiente operación de manera precisa.

          Reglas IMPORTANTES:
          - Responde ÚNICAMENTE un JSON válido.
          - El JSON debe tener exactamente estos campos:
            {
              "resultado": number,
              "latex": string
            }
          - "resultado" es el valor numérico final de la operación.
          - "latex" es una expresión en LaTeX que muestre la operación y el resultado.
          - NO uses bloques de código, NO uses \`\`\`, NO pongas la palabra json.
          - Responde solo el JSON, sin texto adicional.

          Operación: ${operation}
        `,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    let rawText = data.output_text;
    if (!rawText && data.output && data.output[0]?.content?.[0]?.text) {
      rawText = data.output[0].content[0].text;
    }

    if (!rawText) throw new Error("No se encontró el texto de salida en la respuesta.");

    rawText = rawText.trim();
    if (rawText.startsWith("```")) {
      const firstNewline = rawText.indexOf("\n");
      rawText = rawText.slice(firstNewline + 1);
      if (rawText.endsWith("```")) rawText = rawText.slice(0, -3);
      rawText = rawText.trim();
    }

    const parsed = JSON.parse(rawText);
    const { resultado, latex } = parsed;
    if (resultado === undefined || typeof latex !== "string") {
      throw new Error("El JSON no contiene los campos 'resultado' y 'latex' como se esperaba.");
    }

    resultValue.textContent = resultado;
    resultLatex.innerHTML = `$$${latex}$$`;
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();

    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger");
    statusMessage.classList.add("text-success");

  } catch (err) {
    console.error(err);
    statusMessage.textContent = "Ocurrió un error al llamar a la API o parsear el JSON.";
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger");
    resultValue.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
    resultLatex.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
  }
});

// -----------------------------------------------------------------
// EVENT LISTENER: BOTÓN DE LIMPIAR
// -----------------------------------------------------------------

// Asigna una función simple que se ejecuta al hacer clic en "Limpiar".
btnClear.addEventListener("click", () => {
  // Borra el contenido del campo de texto.
  operationInput.value = "";
  // Limpia el mensaje de estado.
  statusMessage.textContent = "";
  // Restablece los campos de resultado a su estado inicial.
  resultValue.innerHTML =
    '<span class="text-muted">Sin resultado aún…</span>';
  resultLatex.innerHTML =
    '<span class="text-muted">Sin resultado aún…</span>';
});