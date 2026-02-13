export default function DreamTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs px-2 py-0.5 rounded-md bg-dream-accent/10 text-dream-accent border border-dream-accent/20"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
