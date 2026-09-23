import fs from "node:fs/promises";
import { prisma } from "../src/app/lib/prisma.js";

const { taskId, post } = JSON.parse(await fs.readFile(new URL("../data/asana-blog-2026-09-23.json", import.meta.url), "utf8"));
try {
  const existing = await prisma.blogPost.findFirst({ where: { OR: [{ slug: post.slug }, { title: post.title }] } });
  if (existing) {
    if (existing.slug !== post.slug || Object.entries(post).some(([field, value]) => existing[field] !== value) || existing.status !== "PUBLISHED") {
      throw new Error("A different version of this post exists; review it before publishing.");
    }
    console.log(JSON.stringify({ taskId, status: "already_published", slug: post.slug }));
  } else if (process.argv.includes("--apply")) {
    const created = await prisma.blogPost.create({ data: { ...post, status: "PUBLISHED", publishedAt: new Date() } });
    console.log(JSON.stringify({ taskId, status: created.status, slug: created.slug, id: created.id }));
  } else {
    console.log(JSON.stringify({ apply: false, taskId, title: post.title, slug: post.slug, coverImageUrl: post.coverImageUrl }));
  }
} finally {
  await prisma.$disconnect();
}
