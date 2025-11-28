import { BorderBeam, Container, ImageKit } from "@/app/components";
import { blogPosts } from "@/app/constants/blogs";
type BlogPostProps = {
  limit?: number;
};

import Link from "next/link";

const BlogPost = ({ limit }: BlogPostProps) => {
  const count =
    typeof limit === "number"
      ? Math.max(0, Math.floor(limit))
      : blogPosts.length;
  const posts =
    count === blogPosts.length ? blogPosts : blogPosts.slice(-count);
  return (
    <section className="pb-16">
      <Container className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 lg:grid-cols-3">
        {posts.map((post) => (
          <div key={post.id}>
            <article className="flex h-full flex-col items-start justify-start rounded-2xl backdrop-blur-2xl bg-white/10">
              <div className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl">
                <Link href={post.href}>
                  <ImageKit
                    alt={post.title}
                    src={post.imageUrl}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="rounded-2xl object-cover bg-background-contrast-white"
                  />
                </Link>
              </div>
              <div className="max-w-xl flex min-h-0 flex-1 flex-col px-4 py-6">
                <div className="flex items-center gap-x-4 text-[10px]">
                  <time dateTime={post.datetime} className="text-white">
                    {post.date}
                  </time>
                  <Link
                    href={post.category.href}
                    className="relative z-10 rounded-full bg-background-contrast px-3 py-1 font-semibold text-white"
                  >
                    {post.category.title}
                  </Link>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 line-clamp-2 text-lg/6 font-semibold text-white">
                    <Link href={post.href}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm/6 text-white/70">
                    {post.description}
                  </p>
                </div>
                <div className="relative mt-auto pt-6 flex items-center gap-x-4">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-background-contrast-white flex-shrink-0">
                    <ImageKit
                      alt={`${post.author.name} avatar`}
                      src={post.author.imageUrl}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover p-0.5"
                    />
                  </div>
                  <div className="text-sm/6">
                    <p className="font-semibold text-white">
                      <Link href={post.author.href}>
                        <span className="absolute inset-0" />
                        {post.author.name}
                      </Link>
                    </p>
                    <p className="text-white/70">{post.author.role}</p>
                  </div>
                </div>
              </div>
              <BorderBeam duration={12} size={200} />
            </article>
          </div>
        ))}
      </Container>
    </section>
  );
};

export default BlogPost;
