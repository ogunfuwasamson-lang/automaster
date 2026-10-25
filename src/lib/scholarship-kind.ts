// a scholarship application is an application whose "program" is the scholarship. safe to import anywhere.
export const SCHOLARSHIP_DEGREE = "Scholarship";
export const isScholarship = (p: { degree?: string | null; kind?: string | null } | null | undefined) => !!p && (p.kind === "scholarship" || p.degree === SCHOLARSHIP_DEGREE);
