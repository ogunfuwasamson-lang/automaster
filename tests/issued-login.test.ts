// portals that create the account themselves and email the login (hec montréal)
import { it, expect } from "vitest";
import { extractCredentials } from "@/lib/verify-mail";
it("reads hec montréal's issued login", () => {
  const text = "Hello, Creation of User ID for online admission application to HEC Montréal confirmed. User ID : samplename Password : 9Abc/7xY NOTE: It is recommended of copy/paste the user id and the password";
  expect(extractCredentials({ subject: "User ID for online admission application to HEC Montréal", text, html: "" })).toEqual({ username: "samplename", password: "9Abc/7xY" });
});
