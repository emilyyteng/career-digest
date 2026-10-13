import {
  FLAVOR_BY_ID,
  friendshipColors,
  paletteFor,
  type CollectorStyle,
  type Edition,
  type FlavorId,
} from "./flavors";
import { FRIENDSHIP_MAX, friendshipLevel } from "./gacha";

export default function FriendshipDots({
  flavor,
  edition,
  count,
  collectorStyle = "mix",
}: {
  flavor: FlavorId;
  edition: Edition;
  count: number;
  collectorStyle?: CollectorStyle;
}) {
  const f = FLAVOR_BY_ID[flavor];
  const palette = paletteFor(f, edition, collectorStyle);
  const colors = friendshipColors(palette);
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
                ? { background: color, borderColor: palette.furShade }
                : { borderColor: color, background: "transparent" }
            }
          />
        ))}
      </span>
    </div>
  );
}
