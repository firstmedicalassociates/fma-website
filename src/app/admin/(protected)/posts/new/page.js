import { requireAdminPage } from "../../../../lib/admin-page-auth";
import NewPostClient from "./new-post-client";
export default async function NewPostPage() { await requireAdminPage("posts.edit"); return <NewPostClient />; }
