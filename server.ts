import express from "express";
import { google } from "googleapis";
import 'dotenv/config';
const app = express();
const port = 3000;
const oauth2Client = new google.auth.OAuth2(
  process.env.Client_ID,
  process.env.Client_secret,
  process.env.Redirect_URL,
);

app.get("/auth", (req, res) => {
  // generate a url that asks permissions for Blogger and Google Calendar scopes
  const scopes = ["https://www.googleapis.com/auth/calendar"];
  //generate the link of consent screen
  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    prompt: "consent",
    // If you only need one scope, you can pass it as a string
    scope: scopes,
  });
  console.log("Client ID:", process.env.Client_ID ? "Found" : "NOT FOUND");
console.log("Client Secret:", process.env.Client_secret ? "Found" : "NOT FOUND");

  res.redirect(url);
});
app.get("/chat", async (req, res) => {
  //after user login on  consent screen it redirect to here with code
  const code = req.query.code as string;
  //exchange code with access token and refresh token
  const { tokens } = await oauth2Client.getToken(code);
  console.log(tokens);
  res.send("connected you can close this teab now");
});
app.get("/", (req, res) => {
  res.send("Hello from Bun & Express!");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
