import { ChatGroq } from "@langchain/groq";
const tools :any= []; //ARRAY OF CUSTOME TOLL

  const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
  }).bindTools(tools);;