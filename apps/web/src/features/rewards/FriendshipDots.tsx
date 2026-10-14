import { friendshipColors, type FlavorId } from "./flavors";
import { FRIENDSHIP_MAX, friendshipLevel } from "./catCakeMath";

/** Classic and Collector's Edition share a flavor's dot gradient. */
export default function FriendshipDots({ flavor, count }: { flavor: FlavorId; count: number }) {
  const colors = friendshipColors(flavor);
  const level = friendshipLevel(count);
  if (count === 0) return null;

  return (
    <div className="rw-friendship" aria-label={`Friendship ${level} of ${FRIENDSHIP_MAX}`}>
      <span className="rw-friendship-label">Friendship:</span>
      <span className="rw-friendship-dots">
        {colors.map((color, i) => (
          <span
            key={i}
            className={`rw-friendship-dot ${i < level ? "rw-friendship-dot--on" : ""}`}
            style={
              i < level
                ? { background: color, borderColor: color }
                : { borderColor: color, background: "transparent" }
            }
          />
        ))}
      </span>
    </div>
  );
}
