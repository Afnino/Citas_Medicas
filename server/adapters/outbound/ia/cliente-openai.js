import OpenAI from "openai";

const openai = new OpenAI();

export async function generarRespuesta({ input, tools = [] }) {
  return openai.responses.create({
    model: "gpt-5.6-luna",
    input,
    tools,
  });
}