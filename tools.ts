import { tool } from "langchain";
import z from "zod";
export const createEventTool  = tool(
  async ({query}) => {
    // Google calendar logicheck create a  meetingc goes
           return 'The meeting has been created.';
  },
  {
    name: 'create-event',
        description: 'Call to create the calendar events.',
        schema: z.object({query: z.string().describe("The query to use in calendar to create event."),
}),
  },
);
export const getEventsTool  = tool(
  async ({query}) => {
    // Google calendar logicheck do i have meetingc goes
    return JSON.stringify([
      {
        title: "Meeting with Sujoy",
        date: "9th Aug 2025",
        time: "2 PM",
        location: "Gmeet",
      },
    ]);
  },
  {
    name: "get-events",
    description: "Call to get the calendar events.",
        schema: z.object({query: z.string().describe("The query to use in calendar to get event.")}),
  },
);