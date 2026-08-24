// netlify/functions/chat.js
//
// Esta función corre en el servidor de Netlify, NUNCA en el navegador del visitante.
// Por eso es el único lugar seguro donde puede vivir tu GROQ_API_KEY: nadie
// que visite tu página puede verla ni robarla desde aquí.
//
// La llave se configura en Netlify (no en este archivo):
// Site settings > Environment variables > GROQ_API_KEY

exports.handler = async function (event) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight de CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Falta configurar GROQ_API_KEY en las variables de entorno de Netlify.",
      }),
    };
  }

  try {
    const { messages, system } = JSON.parse(event.body || "{}");

    if (!Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Formato de mensajes inválido." }),
      };
    }

    const groqMessages = [
      { role: "system", content: system || "Eres un asistente útil." },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          // Cambia el modelo aquí si usas otro en tu dashboard de Distrivenus
          model:"openai/gpt-oss-120b",
          messages: groqMessages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return {
        statusCode: groqResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: data }),
      };
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "Disculpa, no pude generar una respuesta en este momento.";

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
