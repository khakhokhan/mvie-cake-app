import { MvieClient } from "./mvie-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <MvieClient displayName="M’Vie Cake" signOutPath="" />;
}
