import Image from "next/image";

export default function BotAvatar({
  bot,
  size = "sm",
}: {
  bot: { name: string; avatar: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  }[size];

  const initial = bot.name[0]?.toUpperCase() || "?";

  // Generate a consistent color from the bot name
  const hue =
    bot.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  if (bot.avatar) {
    return (
      <Image
        src={bot.avatar}
        alt={bot.name}
        width={56}
        height={56}
        className={`${sizeClass} rounded-full border border-dream-border`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold border`}
      style={{
        backgroundColor: `hsl(${hue}, 60%, 20%)`,
        borderColor: `hsl(${hue}, 60%, 40%)`,
        color: `hsl(${hue}, 80%, 70%)`,
        boxShadow: `0 0 12px hsl(${hue}, 60%, 30%, 0.4)`,
      }}
    >
      {initial}
    </div>
  );
}
