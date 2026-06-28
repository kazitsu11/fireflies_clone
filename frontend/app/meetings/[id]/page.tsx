import { Notepad } from "@/components/notepad/Notepad";

// Next 16: route params are async (a Promise).
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Notepad id={id} />;
}
