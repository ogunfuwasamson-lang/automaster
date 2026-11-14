import { programmeMetadata, renderProgrammes } from "../../render";

export const revalidate = 21600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ dest: string; sub: string }> };

export async function generateMetadata({ params }: P) {
  const { dest, sub } = await params;
  return programmeMetadata(dest, sub);
}

export default async function ProgrammeList({ params }: P) {
  const { dest, sub } = await params;
  return renderProgrammes(dest, sub);
}
