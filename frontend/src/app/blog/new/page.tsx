import { PostEditor } from "@/components/blog/PostEditor";
import { requireRole } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "New post" };

export default async function BlogNewPage() {
  await requireRole("user");
  return <div><PostEditor mode="new" /></div>;
}
