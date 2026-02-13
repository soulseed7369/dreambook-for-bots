export default function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight">
        {title}
      </h1>
      <p className="mt-2 text-dream-text-muted text-lg">{description}</p>
    </div>
  );
}
