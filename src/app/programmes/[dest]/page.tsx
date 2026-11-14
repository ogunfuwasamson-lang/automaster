import { programmeMetadata, renderProgrammes } from "../render";

export const revalidate = 21600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ dest: string }> };

export async function generateMetadata({ params }: P) {
  return programmeMetadata((await params).dest);
}

export default async function DestinationProgrammes({ params }: P) {
  return renderProgrammes((await params).dest);
}
