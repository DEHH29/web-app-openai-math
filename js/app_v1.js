// -----------------------------------------------------------------
// CONFIGURACIÓN Y CONSTANTES
// -----------------------------------------------------------------

// 🚨 ¡ADVERTENCIA DE SEGURIDAD GRAVE!
// Esta clave de API está expuesta en el código del cliente (frontend).
// CUALQUIER persona que visite tu sitio web puede verla y usarla.
// Esto puede generar cargos masivos en tu cuenta de OpenAI.
// ¡DEBES REVOCAR esta clave inmediatamente desde tu panel de OpenAI!
const OPENAI_API_KEY = "https://690a3d841a446bb9cc21e984.mockapi.io/apiKeyOpenAI";

// -----------------------------------------------------------------
// SELECCIÓN DE ELEMENTOS DEL DOM
// -----------------------------------------------------------------
// Se obtienen las referencias a los elementos HTML de la página
// para poder interactuar con ellos (leer valores, escribir contenido, etc.).

/** @type {HTMLButtonElement} Botón para "Evaluar" */
const btnEvaluate = document.getElementById("btnEvaluate");

/** @type {HTMLButtonElement} Botón para "Limpiar" */
const btnClear = document.getElementById("btnClear");

/** @type {HTMLInputElement} Campo de texto (input) donde el usuario escribe la operación */
const operationInput = document.getElementById("operationInput");

/** @type {HTMLElement} Párrafo o span para mostrar mensajes de estado (ej. "Calculando...", "Error") */
const statusMessage = document.getElementById("statusMessage");

/** @type {HTMLElement} Elemento para mostrar el resultado numérico final */
const resultValue = document.getElementById("resultValue");

/** @type {HTMLElement} Elemento para mostrar la fórmula LaTeX */
const resultLatex = document.getElementById("resultLatex");

// -----------------------------------------------------------------
// EVENT LISTENER: BOTÓN DE EVALUAR
// -----------------------------------------------------------------

// Se asigna una función asíncrona (async) que se ejecutará cuando
// el usuario haga clic en el botón "Evaluar".
btnEvaluate.addEventListener("click", async () => {
  // 1. OBTENER Y VALIDAR LA ENTRADA
  // Se obtiene el valor del campo de texto y .trim() elimina espacios en blanco al inicio y al final.
  const operation = operationInput.value.trim();

  // Si el campo está vacío (es una cadena vacía)...
  if (!operation) {
    // ...muestra un mensaje de error al usuario.
    statusMessage.textContent = "Escribe una operación primero.";
    // Quita clases de estilo neutrales/anteriores.
    statusMessage.classList.remove("text-muted");
    // Añade la clase de Bootstrap (u otra librería) para texto de peligro (rojo).
    statusMessage.classList.add("text-danger");
    // Detiene la ejecución de la función. No se hace la llamada a la API.
    return;
  }

  // 2. ACTUALIZAR ESTADO A "CARGANDO"
  // Informa al usuario que la consulta está en proceso.
  statusMessage.textContent = "Consultando OpenAI...";
  // Resetea los estilos del mensaje de estado a "text-muted" (gris).
  statusMessage.classList.remove("text-danger");
  statusMessage.classList.add("text-muted");

  // Muestra un texto de "Calculando..." en los campos de resultado.
  resultValue.innerHTML = '<span class="text-muted">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Calculando…</span>';

  // 3. BLOQUE TRY...CATCH PARA MANEJAR ERRORES DE API
  // Se usa try...catch porque la llamada 'fetch' (red) o el parseo
  // posterior pueden fallar.
  try {
    // 4. LLAMADA FETCH A LA API DE OPENAI
    // Se inicia la llamada de red asíncrona (await) a la API.
    // NOTA: El endpoint 'v1/responses' es un endpoint antiguo/probablemente
    // incorrecto para 'gpt-4.1-mini', que usualmente usa 'v1/chat/completions'.
    const response = await fetch("https://api.openai.com/v1/responses", {
      // Se especifica el método HTTP como "POST", ya que enviaremos datos.
      method: "POST",
      // Se configuran las cabeceras HTTP.
      headers: {
        "Content-Type": "application/json", // Informa al servidor que el cuerpo (body) es un JSON.
        // Se añade la cabecera de autorización con la clave API (Bearer Token).
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      // Se define el cuerpo (body) de la petición.
      body: JSON.stringify({
        model: "gpt-4.1-mini", // Modelo de IA a utilizar.
        // 'input' es el prompt principal para el modelo.
        // NOTA: Los modelos de chat modernos (GPT-4) esperan un array 'messages'.
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
        `, // Se inyecta la operación del usuario en el prompt.
        temperature: 0, // Se pone la 'temperatura' en 0 para obtener respuestas deterministas y precisas.
      }),
    });

    // 5. MANEJO DE RESPUESTA HTTP
    // Se comprueba si la respuesta de la API NO fue exitosa (ej. 401, 404, 500).
    if (!response.ok) {
      // Se intenta leer el cuerpo del error como texto.
      const errorText = await response.text();
      // Se imprime el error en la consola del navegador para depuración.
      console.error("Error HTTP:", response.status, errorText);
      // Se lanza un nuevo error para ser capturado por el bloque 'catch' de más abajo.
      throw new Error(`Error HTTP ${response.status}`);
    }

    // Si la respuesta fue 'ok' (ej. 200), se parsea el cuerpo de la respuesta como JSON.
    const data = await response.json();
    console.log("Respuesta completa de OpenAI:", data); // Para depuración.

    // 6. EXTRACCIÓN DEL TEXTO DE SALIDA DE LA IA
    // Se intenta obtener el texto de la respuesta. El código prueba dos
    // posibles estructuras de respuesta de la API (data.output_text o data.output[0]...).
    let rawText = data.output_text;
    if (!rawText && data.output && data.output[0]?.content?.[0]?.text) {
      rawText = data.output[0].content[0].text;
    }

    // Si no se encontró texto en ninguna de las rutas esperadas, se lanza un error.
    if (!rawText) {
      throw new Error("No se encontró el texto de salida en la respuesta.");
    }

    console.log("Texto bruto de la IA:", rawText); // Para depuración.

    // 7. LIMPIEZA Y PARSEO DEL JSON
    // A pesar del prompt, la IA a veces puede envolver la respuesta en ```json ... ```
    // Este bloque intenta limpiar esos marcadores de código.
    rawText = rawText.trim(); // Quita espacios al inicio y final.

    // Si el texto comienza con ```
    if (rawText.startsWith("```")) {
      // Encuentra el primer salto de línea (para quitar ```json o ```)
      const firstNewline = rawText.indexOf("\n");
      if (firstNewline !== -1) {
        // Se queda solo con el texto después de la primera línea.
        rawText = rawText.slice(firstNewline + 1);
      }
      // Si el texto (ya modificado o no) termina con ```
      if (rawText.endsWith("```")) {
        // Se queda solo con el texto antes de los últimos ```
        rawText = rawText.slice(0, -3);
      }
      // Se vuelve a limpiar de espacios por si acaso.
      rawText = rawText.trim();
    }

    // Se intenta parsear (convertir) el texto limpio a un objeto JavaScript.
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      // Si JSON.parse falla (porque el texto no es un JSON válido)...
      console.error("No se pudo hacer JSON.parse(rawText):", rawText);
      // ...se lanza un error que será capturado por el 'catch' principal.
      throw new Error("La IA no regresó un JSON limpio/parseable. Revisa la consola.");
    }

    // 8. VALIDACIÓN DE LA ESTRUCTURA DEL JSON
    // Se extraen las propiedades 'resultado' y 'latex' del objeto parseado.
    // (Esto se llama "desestructuración").
    const { resultado, latex } = parsed;

    // Se valida que ambas propiedades existan y que 'latex' sea un string.
    if (resultado === undefined || typeof latex !== "string") {
      throw new Error(
        "El JSON no contiene los campos 'resultado' y 'latex' como se esperaba."
      );
    }

    // 9. MOSTRAR RESULTADOS EXITOSOS
    // Se muestra el valor numérico en el elemento 'resultValue'.
    resultValue.textContent = resultado;
    // Se envuelve la respuesta LaTeX con '$$' (delimitadores de bloque LaTeX)
    // y se inserta como HTML. Una librería como MathJax debe detectar esto.
    resultLatex.innerHTML = `$$${latex}$$`;

    // Si la librería MathJax está cargada en la página (en el objeto 'window'),
    // se le pide que busque y renderice el nuevo código LaTeX que se acaba de insertar.
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }

    // Se actualiza el mensaje de estado a "exitoso".
    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger");
    statusMessage.classList.add("text-success"); // Clase de estilo para éxito (verde).
  } catch (err) {
    // 10. BLOQUE CATCH: MANEJO CENTRALIZADO DE ERRORES
    // Este bloque se activa si CUALQUIER 'throw new Error()' ocurre en el bloque 'try'.
    console.error(err); // Muestra el error completo en la consola del navegador.
    // Informa al usuario que algo salió mal.
    statusMessage.textContent = "Ocurrió un error al llamar a la API o parsear el JSON.";
    // Pone el mensaje de estado en color rojo.
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger");
    // Resetea los campos de resultado a un mensaje de error.
    resultValue.innerHTML =
      '<span class="text-muted">Sin resultado por error…</span>';
    resultLatex.innerHTML =
      '<span class="text-muted">Sin resultado por error…</span>';
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