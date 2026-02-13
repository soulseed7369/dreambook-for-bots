import { MOODS } from "@/lib/constants";

export default function MoodBadge({ mood }: { mood: string }) {
  const moodConfig = MOODS.find((m) => m.value === mood);
  const color = moodConfig?.color || "#8b5cf6";

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border"
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
      }}
    >
      {moodConfig?.label || mood}
    </span>
  );
}
