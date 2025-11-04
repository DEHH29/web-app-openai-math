// -----------------------------------------------------------------
// CONFIGURACIÓN Y CONSTANTES
// -----------------------------------------------------------------

// URL de MockAPI donde está almacenada la API key de OpenAI.
// Se usará un fetch GET para obtenerla dinámicamente antes de llamar a OpenAI.
const MOCKAPI_URL = "https://690a3d841a446bb9cc21e984.mockapi.io/apiKeyOpenAI";


// -----------------------------------------------------------------
// EVENT LISTENER: BOTÓN DE EVALUAR
// -----------------------------------------------------------------

// Se agrega un "listener" al botón 'btnEvaluate'. Cada vez que se haga clic,
// se ejecuta esta función asíncrona para procesar la operación ingresada.
btnEvaluate.addEventListener("click", async () => {

  // 1️⃣ OBTENER LA OPERACIÓN DEL USUARIO
  // Se toma el valor del input 'operationInput' y se eliminan espacios al inicio y final.
  const operation = operationInput.value.trim();

  // Validación: si el usuario no escribió nada, se muestra un mensaje de error y se detiene la ejecución.
  if (!operation) {
    statusMessage.textContent = "Escribe una operación primero.";
    statusMessage.classList.remove("text-muted");
    statusMessage.classList.add("text-danger"); // mensaje en rojo
    return; // detiene la ejecución del resto de la función
  }

  // 2️⃣ INDICAR QUE SE ESTÁ CONSULTANDO LA API
  statusMessage.textContent = "Consultando OpenAI...";
  statusMessage.classList.remove("text-danger");
  statusMessage.classList.add("text-muted"); // mensaje en gris mientras carga

  // Se muestra un mensaje de "Calculando…" en los campos de resultados.
  resultValue.innerHTML = '<span class="text-muted">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Calculando…</span>';

  // 3️⃣ BLOQUE TRY/CATCH PARA MANEJAR ERRORES
  try {

    // 3.1️⃣ OBTENER LA API KEY DESDE MOCKAPI
    // Se hace una petición GET a MockAPI para obtener la clave de OpenAI.
    const keyResponse = await fetch(MOCKAPI_URL);

    // Validación de la respuesta HTTP
    if (!keyResponse.ok)
      throw new Error(`Error al obtener la API key: ${keyResponse.status}`);

    // Parsear la respuesta JSON
    const keyData = await keyResponse.json();

    // Validación de la estructura de la respuesta
    if (!keyData || !keyData[0]?.apiKey)
      throw new Error("No se encontró la API key en MockAPI");

    // Guardar la API key en una constante local
    const OPENAI_API_KEY = keyData[0].apiKey;


    // 3.2️⃣ LLAMADA A LA API DE OPENAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", // se envía un POST
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`, // se pasa la API key obtenida
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // modelo de OpenAI a utilizar
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

          Operación: ${operation} // se inyecta la operación del usuario
        `,
        temperature: 0, // para resultados deterministas
      }),
    });

    // Validación de la respuesta HTTP de OpenAI
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    // Parsear la respuesta JSON
    const data = await response.json();

    // 3.3️⃣ EXTRAER EL TEXTO DE RESPUESTA DE OPENAI
    // Se prueba varias rutas posibles dependiendo de la estructura que devuelva la API.
    let rawText = data.output_text;
    if (!rawText && data.output && data.output[0]?.content?.[0]?.text) {
      rawText = data.output[0].content[0].text;
    }

    // Si no se encontró texto, se lanza un error
    if (!rawText)
      throw new Error("No se encontró el texto de salida en la respuesta.");

    // 3.4️⃣ LIMPIAR EL TEXTO DEVUELTO POR LA IA
    rawText = rawText.trim();
    if (rawText.startsWith("```")) {
      const firstNewline = rawText.indexOf("\n");
      rawText = rawText.slice(firstNewline + 1);
      if (rawText.endsWith("```")) rawText = rawText.slice(0, -3);
      rawText = rawText.trim();
    }

    // 3.5️⃣ PARSEAR EL JSON DEVUELTO POR OPENAI
    const parsed = JSON.parse(rawText);
    const { resultado, latex } = parsed;

    // Validación de campos obligatorios
    if (resultado === undefined || typeof latex !== "string") {
      throw new Error(
        "El JSON no contiene los campos 'resultado' y 'latex' como se esperaba."
      );
    }

    // 3.6️⃣ MOSTRAR LOS RESULTADOS EN EL HTML
    resultValue.textContent = resultado;
    resultLatex.innerHTML = `$$${latex}$$`;

    // Renderizar LaTeX con MathJax si está cargado
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();

    // Mensaje de éxito
    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger");
    statusMessage.classList.add("text-success");

  } catch (err) {
    // 3.7️⃣ MANEJO DE ERRORES
    console.error(err);
    statusMessage.textContent =
      "Ocurrió un error al llamar a la API o parsear el JSON.";
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger");

    // Reiniciar los resultados a un estado de error
    resultValue.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
    resultLatex.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
  }
});


// -----------------------------------------------------------------
// EVENT LISTENER: BOTÓN DE LIMPIAR
// -----------------------------------------------------------------

// Se agrega un "listener" al botón 'btnClear'. Al hacer clic, limpia
// el campo de entrada, los mensajes de estado y los resultados.
btnClear.addEventListener("click", () => {
  // Limpiar el input de operación
  operationInput.value = "";

  // Limpiar mensaje de estado
  statusMessage.textContent = "";

  // Reiniciar resultados
  resultValue.innerHTML = '<span class="text-muted">Sin resultado aún…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Sin resultado aún…</span>';
});