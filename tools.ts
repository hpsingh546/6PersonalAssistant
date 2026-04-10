import { google } from "googleapis";
import { tool } from "langchain";
import z from "zod";
import tokens from "./tokens.json";

// Create a new Calendar API client.
const oauth2Client = new google.auth.OAuth2(
  process.env.Client_ID,
  process.env.Client_secret,
  process.env.Redirect_URL,
);//It tells Google who your app is and where to send the user after they log in (Redirect URL).
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
oauth2Client.setCredentials(tokens);//If the tokens object contains a refresh_token, this library will automatically refresh the access token for you whenever it expires, so you don't have to write manual refresh logic.

// Get the list of events.
type Params = {
  q: string;
  timeMin: string;
  timeMax: string;
};
export const getEventsTool = tool(
  async (params) => {
    /**
     * q
     * timeMin
     * timeMax
     */
    const { timeMin, timeMax, q } = params as Params;//whatever we receive in param we should validate in the zod schema unless ai continue make tool call as he dont know 
    console.log(timeMin, timeMax, q);
    try {
      const result = await calendar.events.list({
        calendarId: "primary", //CALENDER ID IS MANDATORY AND IT IS EMAILD  OR NEED TO MENTION PRIMARY TO ACCESS DEFAULT CALENDER//in order to find parameter we go to refrence inside documentation https://developers.google.com/workspace/calendar/api/v3/reference/events/list
        // q:"tiger analytics"
        q: q,
        timeMax: timeMax,
        timeMin: timeMin,
      });
      const finalResult = result.data.items?.map((event) => {
        return {
          id: event.id,
          summary: event.summary,
          status: event.status,
          organiser: event.organizer,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          meetingLink: event.hangoutLink,
          eventType: event.eventType,
        };
      });

      // console.log(finalResult);
      return JSON.stringify(finalResult);
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
const createEventSchema=z.object({
      summary: z.string().describe("The title of the event"),
      start: z.object({
        dateTime: z
          .string()
          .describe("The start date time of the event in UTC"),
        timeZone: z.string().describe("The timezone of the event time in UTC"),
      }),
      end: z.object({
        dateTime: z.string().describe("The end date time of the event in UTC"),
        timeZone: z.string().describe("The timezone of the event time in UTC"),
      }),
      attendees: z.array(
        z.object({
          email: z.string().describe("The email of the attendee"),
          displayName: z.string().describe("Then name of the attendee."),
        }),
      ),
    })
    type EventData=z.infer<typeof createEventSchema>//evendata is as same as we earlier use it=first we make zod se schema then we push it inside the as infer
// type attendee = {
//   email: string;
//   displayName: string;
// };
// type EventData = {
//   summary: string;
//   start: {
//     dateTime: string;
//     timeZone: string;
//   };
//   end: {
//     dateTime: string;
//     timeZone: string;
//   };
//   attendees: attendee[];
// };
export const createEventTool = tool(
  async (eventData) => {
    // Google calendar logicheck create a  meetingc goes
    const { summary, start, end, attendees } = eventData as EventData;
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary,
        start,
        end,
        attendees,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });

    if (response.statusText === "OK") {
      return "The meeting has been created.";
    }

    return "Couldn't create a meeting.";
  },
  {
    name: "create-event",
    description: "Call to create the calendar events.",
    schema: createEventSchema,
  },
);
