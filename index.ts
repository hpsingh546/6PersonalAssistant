import { ChatGroq } from "@langchain/groq";
import { createEventTool, getEventsTool } from "./tools";
import { StateGraph, MessagesAnnotation, END, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "langchain";

import readline from "node:readline/promises";

const tools: any = [createEventTool, getEventsTool]; //ARRAY OF CUSTOME TOLL

const model = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
  console.log("calling Assistant...");
  const resp = await model.invoke(state.messages); //send all the message to llm
  // console.log("Response from model", resp);
  // console.log("LLm Response=>", resp); // Here, we are appending the LLM's response message to the 'messages' array.

  return { messages: [resp] };
}
const toolNode = new ToolNode(tools);
/**conditional edge */
function shouldcontinue(state: typeof MessagesAnnotation.State) {
  /**
   * check the previous ai messaage if toolcall return tool
   * else return __end__
   */
  // console.log(state.messages);

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If the LLM wants to use a tool, go to the "Tools" node
  if (lastMessage.tool_calls?.length) {
    console.log("tool call details",lastMessage.tool_calls)
    return "Tools";
  }
  // Otherwise, stop
  return "__end__";
}
const graph = new StateGraph(MessagesAnnotation)
  .addNode("Assistant", callModel)
  .addNode("Tools", toolNode)
  .addEdge("__start__", "Assistant") //1
  .addEdge("Tools", "Assistant")
  .addConditionalEdges("Assistant", shouldcontinue, {
    __end__: END,
    Tools: "Tools",
  }); //2
   // 3. Initialize MemorySaver
const memory = new MemorySaver();//memory setup step 1
const app = graph.compile({checkpointer:memory});//step 2 pass as argument to graph
async function main() {
   const config = { configurable: { thread_id: "conversation-123" } };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  while (true) {
    const userQuery = await rl.question("You: ");

    if (userQuery === "bye") break;

    const result = await app.invoke({
      messages: [
        {
          role: "user",
          //  'Can you create a meeting with Harmanpreet singh(harmanpreetsingh004@gmail.com) at 4PM today about Backend discussion?',
          content:userQuery
          // "do i have meeting from last year march till now "
        },
      ],
    },config);
    const message = result.messages;
    console.log("Ai:", message?.[message.length - 1]?.content);
    // console.log(result);
  }
  rl.close();
}
main();
