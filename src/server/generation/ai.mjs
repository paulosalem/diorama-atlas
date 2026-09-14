export function createStructuredResponder(openai) {
  return async function requestStructuredResponse({
    candidates,
    instructions,
    input,
    schema,
    maxOutputTokens = 3600,
  }) {
    if (!openai) {
      const error = new Error(
        "OPENAI_API_KEY is not set for structured scene analysis.",
      );
      error.statusCode = 503;
      throw error;
    }

    let lastError = null;

    for (const model of candidates) {
      try {
        const response = await openai.responses.create({
          model,
          instructions,
          input,
          max_output_tokens: maxOutputTokens,
          text: {
            format: {
              type: "json_schema",
              name: schema.name,
              strict: schema.strict,
              schema: schema.schema,
            },
          },
        });
        const raw = response.output_text?.trim();
        if (!raw) {
          throw new Error(
            `OpenAI returned no structured output for ${schema.name}.`,
          );
        }
        return { parsed: JSON.parse(raw), model };
      } catch (error) {
        lastError = error;
        if (!canFallbackModel(error)) {
          break;
        }
      }
    }

    throw lastError;
  };
}

export function canFallbackModel(error) {
  const status = error?.status ?? error?.cause?.status;
  return status === 400 || status === 403 || status === 404;
}
