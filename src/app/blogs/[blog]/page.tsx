const BlogPage = async ({ params }: { params: Promise<{ blog: string }> }) => {
  const { blog } = await params;

  console.log(blog);

  return (
    <main className="flex justify-center items-center h-[100svh]">
      <h1 className="text-white">{blog}</h1>
    </main>
  );
};

export default BlogPage;
