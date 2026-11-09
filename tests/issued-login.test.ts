// portals that create the account themselves and email the login (hec montréal)
import { it, expect } from "vitest";
import { extractCredentials } from "@/lib/verify-mail";
it("reads hec montréal's issued login", () => {
  const text = "Hello, Creation of User ID for online admission application to HEC Montréal confirmed. User ID : samplename Password : 9Abc/7xY NOTE: It is recommended of copy/paste the user id and the password";
  expect(extractCredentials({ subject: "User ID for online admission application to HEC Montréal", text, html: "" })).toEqual({ username: "samplename", password: "9Abc/7xY" });
});

import { fromPortal } from "@/lib/verify-mail";
it("only takes codes from the portal's own emails", () => {
  const github = { from: "GitHub <noreply@github.com>", text: "Here is your GitHub sudo authentication code: 12345678", html: "" };
  expect(fromPortal(github, "future.mcgill.ca")).toBe(false);
  expect(fromPortal({ from: "McGill University Admissions <no-reply.es@mcgill.ca>", text: "Your code is 482913", html: "" }, "future.mcgill.ca")).toBe(true);
  // a portal hosted elsewhere: the email links to it
  expect(fromPortal({ from: "UTD Applicant Portal <admission@utdallas.edu>", text: "confirm at https://utdcomet.my.site.com/ApplicantPortal/s/", html: "" }, "utdcomet.my.site.com")).toBe(true);
});
