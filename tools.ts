import { google } from "googleapis";
import { tool } from "langchain";
import z from "zod";
import tokens from "./tokens.json";

// Create a new Calendar API client.
const oauth2Client = new google.auth.OAuth2(
  process.env.Client_ID,
  process.env.Client_secret,
  process.env.Redirect_URL,
);
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
oauth2Client.setCredentials(tokens);

// Get the list of events.
type Params={
  q:string;
  timeMin:string;
  timeMax:string
}
export const getEventsTool = tool(
  async (params) => {
    /**
     * q
     * timeMin
     * timeMax
     */
    const { timeMin, timeMax, q } = params as Params;
    console.log(timeMin, timeMax, q)
    try {
      const result = await calendar.events.list({
        calendarId: "primary", //CALENDER ID IS MANDATORY AND IT IS EMAILD  OR NEED TO MENTION PRIMARY TO ACCESS DEFAULT CALENDER//in order to find parameter we go to refrence inside documentation https://developers.google.com/workspace/calendar/api/v3/reference/events/list
        // q:"tiger analytics"
        q:q,
        timeMax:timeMax,
        timeMin:timeMin
      });
      const finalResult=result.data.items?.map((event)=>{return {
         id: event.id,
                    summary: event.summary,
                    status: event.status,
                    organiser: event.organizer,
                    start: event.start,
                    end: event.end,
                    attendees: event.attendees,
                    meetingLink: event.hangoutLink,
                    eventType: event.eventType,
      } })
      
      console.log(finalResult);
      return JSON.stringify(finalResult)
    } catch (err) {
      console.log(err);
    }
    // Google calendar logicheck do i have meetingc goes
    return "failed to find event";
  },
  {
    name: "get-events",
    description: "Call to get the calendar events.",
    schema: z.object({
      q: z
        .string()
        .describe(
          "The query to be used to get events from google calendar. It can be one of these values: summary, description, location, attendees display name, attendees email, organiser's name, organiser's email",
        ),
      timeMin: z
        .string()
        .describe("The from datetime in UTC format for the event"),
      timeMax: z
        .string()
        .describe("The to datetime in UTC format for the event"),
    }),
  },
);


export const createEventTool = tool(
  async ({ query }) => {
    // Google calendar logicheck create a  meetingc goes
    return "The meeting has been created.";
  },
  {
    name: "create-event",
    description: "Call to create the calendar events.",
    schema: z.object({
      query: z
        .string()
        .describe("The query to use in calendar to create event."),
    }),
  },
);
