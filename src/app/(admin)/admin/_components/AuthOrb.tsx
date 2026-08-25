/**
 * The sign-in orb — the loading state for /admin/login and /admin/reset-password.
 *
 * It exists because the two auth screens used to report progress through their
 * OWN SIGN IN BUTTON: the label swapped to "Signing in…" while the credentials
 * were checked, and then a black pill — the same shape, ink and radius as the
 * button beneath it — appeared over the card during the navigation. A button is
 * an affordance for an action; dressing a wait as one invites a second tap and
 * says nothing while it does it. So the buttons went back to being buttons and
 * the wait moved here.
 *
 * Pure CSS, deliberately. The auth shell already runs ThemedShader (three.js on
 * a real WebGL context) behind the card, and a second context for a progress
 * indicator would be absurd — this is four blurred gradients in a clipped disc.
 *
 * Every animated layer is `motion-safe:`, so under prefers-reduced-motion the
 * orb simply holds still and the caption beside it carries the message. (The
 * spinner this replaced had no such guard.)
 *
 * The palette lives in globals.css under `.auth-orb`, not here: `white` and
 * `black` are FLIP tokens in this codebase, so the sheen and rim have to be
 * stated as real white at a per-theme alpha rather than as `white/50`.
 */
export default function AuthOrb() {
  return (
    <span
      aria-hidden="true"
      className="auth-orb relative grid size-20 place-items-center"
    >
      {/* Ambient halo, outside the sphere so it can bleed past the edge. */}
      <span className="absolute -inset-[22%] rounded-full bg-[radial-gradient(circle,var(--orb-halo),transparent_70%)] blur-lg motion-safe:animate-orb-glow" />

      {/* The sphere. overflow-hidden is what makes the drifting clouds read as
          weather INSIDE a ball rather than three blobs floating near each other. */}
      <span className="relative size-20 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_45%,var(--orb-core),var(--orb-shell))] shadow-[0_14px_32px_-12px_rgb(15_18_35/0.5)]">
        <span className="absolute -inset-[25%] rounded-full bg-[radial-gradient(circle,var(--orb-mint),transparent_65%)] blur-md motion-safe:animate-orb-a" />
        <span className="absolute -inset-[25%] rounded-full bg-[radial-gradient(circle,var(--orb-lilac),transparent_65%)] blur-md motion-safe:animate-orb-b" />
        <span className="absolute -inset-[25%] rounded-full bg-[radial-gradient(circle,var(--orb-peach),transparent_65%)] blur-md motion-safe:animate-orb-c" />

        {/* Specular highlight, up and to the left — the one cue that turns a
            circle into a sphere. It sits ABOVE the clouds so they pass under it. */}
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_34%_28%,var(--orb-sheen),transparent_46%)]" />

        {/* Lit rim. */}
        <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--orb-rim)]" />
      </span>
    </span>
  );
}
