import { redirect } from "next/navigation";

// the interviewer is a panel now, open from any page
export default function InterviewPage() {
  redirect("/dashboard?chat=open");
}
