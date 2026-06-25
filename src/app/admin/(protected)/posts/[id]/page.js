import { notFound } from "next/navigation";
import { isBlogCategoryCompatibilityError } from "../../../../lib/blog-categories";
import { prisma } from "../../../../lib/prisma";
import { parseContentHtml } from "../../../../lib/post-builder";
import PostForm from "../post-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPost(id) {
  try {
    return await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        category: true,
        metaTitle: true,
        metaDescription: true,
        slug: true,
        contentHtml: true,
        coverImageUrl: true,
        coverImageAlt: true,
        status: true,
      },
    });
  } catch (error) {
    if (!isBlogCategoryCompatibilityError(error)) throw error;
  }

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      metaTitle: true,
      metaDescription: true,
      slug: true,
      contentHtml: true,
      coverImageUrl: true,
      coverImageAlt: true,
      status: true,
    },
  });

  return post ? { ...post, category: "Uncategorized" } : null;
}

export default async function EditPostPage({ params }) {
  const { id } = await params;
  if (!id) notFound();

  const post = await loadPost(id);

  if (!post) notFound();

  const parsedContent = parseContentHtml(post.contentHtml);

  return (
    <PostForm
      mode="edit"
      initialPost={{
        id: post.id,
        pageTitle: post.title,
        category: post.category || "Primary Care",
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        header: parsedContent.header,
        slug: post.slug,
        featuredImageUrl: post.coverImageUrl || "",
        featuredImageAlt: post.coverImageAlt || "",
        footer: parsedContent.footer,
        sections: parsedContent.sections,
        status: post.status,
      }}
    />
  );
}
