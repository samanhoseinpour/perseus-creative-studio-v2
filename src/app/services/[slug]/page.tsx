const ServiceDetailPage = ({ params }: { params: { slug: "string" } }) => {
  const { slug } = params;

  return (
    <main className="flex justify-center items-center h-[100svh]">
      <h1>{slug} Page</h1>
    </main>
  );
};

export default ServiceDetailPage;
