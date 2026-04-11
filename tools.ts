import { google } from "googleapis";
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";

import z from "zod";

// Create a new Calendar API client.
const oauth2Client = new google.auth.OAuth2(
  process.env.Client_ID,
  process.env.Client_secret,
  process.env.Redirect_URL,
); //It tells Google who your app is and where to send the user after they log in (Redirect URL).
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
// console.log(
//   "Access token",
//   process.env.Access_Token,
//   "refresh token",
//   process.env.Refresh_Token,
// );
oauth2Client.setCredentials({
  access_token: process.env.Access_Token,
  refresh_token: process.env.Refresh_Token,
}); //If the tokens object contains a refresh_token, this library will automatically refresh the access token for you whenever it expires, so you don't have to write manual refresh logic.

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
    const { timeMin, timeMax, q } = params as Params; //whatever we receive in param we should validate in the zod schema unless ai continue make tool call as he dont know
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

      console.log("Get event tools data=>", JSON.stringify(finalResult));
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
      timeMin: z.string().describe("The from datetime to get events."),
      timeMax: z.string().describe("The to datetime to get events."),
    }),
  },
);
const createEventSchema = z.object({
  summary: z.string().describe("The title of the event"),
  start: z.object({
    dateTime: z.string().describe("The date time of start of the event."),
    timeZone: z.string().describe("Current IANA timezone string."),
  }),
  end: z.object({
    dateTime: z.string().describe("The date time of end of the event."),
    timeZone: z.string().describe("Current IANA timezone string."),
  }),
  attendees: z.array(
    z.object({
      email: z.string().describe("The email of the attendee"),
      displayName: z.string().describe("Then name of the attendee."),
    }),
  ),
});
type EventData = z.infer<typeof createEventSchema>; //evendata is as same as we earlier use it=first we make zod se schema then we push it inside the as infer
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

export const Search = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

/**Update tool take from deep seek*/

// Assume oauth2Client and calendar are already configured as in your code
// const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Schema for updating an event – all fields except eventId are optional
const updateEventSchema = z.object({
  eventId: z
    .string()
    .describe("The ID of the event to update (obtained from get-events tool)."),
  summary: z.string().describe("New title of the event."),
  getSummary: z
    .string()
    .describe(
      "title of the event.That is present when event is created (obtained from get-events tool)",
    ),
  attendee: z.array(
    z.object({
      email: z
        .string()
        .describe(
          "Attendee email address.That is present when event is created (obtained from get-events tool)",
        ),
      displayName: z.string().describe(" Attendee display name."),
    }),
  ),
  start: z.object({
    dateTime: z.string().describe("New start date-time (ISO 8601)."),
    timeZone: z.string().describe("IANA timezone string."),
  }),
  getStart: z.object({
    dateTime: z
      .string()
      .describe(
        " start date-time (ISO 8601).when event is created (obtained from get-events tool)",
      ),
    timeZone: z.string().describe("IANA timezone string."),
  }),
  end: z.object({
    dateTime: z.string().describe("New end date-time (ISO 8601)."),
    timeZone: z.string().describe("IANA timezone string."),
  }),
  getEnd: z.object({
    dateTime: z
      .string()
      .describe(
        "End date-time (ISO 8601).when event is created (obtained from get-events tool)",
      ),
    timeZone: z.string().describe("IANA timezone string."),
  }),
  attendeesUsrWntToadd: z.array(
    z.object({
      email: z.string().describe("New Attendee email address.user want to add"),
      displayName: z.string().describe("New Attendee display name."),
    }),
  ),
  // You can extend with other fields: description, location, etc.
});

type UpdateEventParams = z.infer<typeof updateEventSchema>;

export const updateEventTool = tool(
  async (params: UpdateEventParams) => {
    const {
      eventId,
      summary,
      getSummary,
      start,
      getStart,
      end,
      getEnd,
      attendee,
      attendeesUsrWntToadd,
    } = params;
    try {
      console.log("parma received by update ", eventId,
      summary,
      getSummary,
      start,
      getStart,
      end,
      getEnd,
      attendee,
      attendeesUsrWntToadd)
      // Build the request body – only include fields that are provided
      const requestBody: any = {};
      summary
        ? (requestBody.summary = summary)
        : (requestBody.summary = getSummary);
      start ? (requestBody.start = start) : (requestBody.start = getStart);
      end ? (requestBody.end = end) : (requestBody.end = getEnd);
      attendeesUsrWntToadd
        ? (requestBody.attendees = [...attendeesUsrWntToadd, ...attendee])
        : (requestBody.attendees = [...attendee]);
      console.log("Update Tool request body", requestBody, eventId);
      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: requestBody,
        // Optional: send updates to attendees
        sendUpdates: "all",
        // If you need to keep conference data, you might want to fetch the existing event first
        // and merge conferenceData, but for simplicity we omit it.
      });

      if (response.status === 200) {
        return `Event "${response.data.summary}" (ID: ${eventId}) updated successfully.`;
      } else {
        return `Failed to update event. HTTP status: ${response.status}`;
      }
    } catch (error: any) {
      console.error("Error updating event:", error);
      return `Error: ${error.message || "Could not update the event."}`;
    }
  },
  {
    name: "update-event",
    description:
      "Update an existing Google Calendar event. Provide the eventId (from get-events), and the fields you want to change (summary, start, end, attendees).Always Merge the attendee unless user explitly say to remove the attendee if user have not provide get the attende from (from get-events) ",
    schema: updateEventSchema,
  },
);


const deleteEventSchema=z.object({
    eventId: z
    .string()
    .describe("The ID of the event to update (obtained from get-events tool)."),
})
type DeleteEventParams = z.infer<typeof deleteEventSchema>;

export const deleteEventTool=tool(async(param:DeleteEventParams)=>{
const {eventId}=param;
try{ 
  const response = await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates:"all"
      })
      if (response.status === 200) {
        return `Event "${response.data}" (ID: ${eventId}) updated successfully.`;
      } else {
        return `Failed to update event. HTTP status: ${response.status}`;
      }
    } catch (error: any) {
      console.error("Error updating event:", error);
      return `Error: ${error.message || "Could not update the event."}`;
    }
      }

  , {
    name: "delete-event",
    description:
      "delete an existing Google Calendar event. Provide the eventId (from get-events) ",
    schema: deleteEventSchema,
  })