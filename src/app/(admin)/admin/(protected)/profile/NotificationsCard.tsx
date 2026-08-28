'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LuBell, LuBellOff, LuBellRing, LuSmartphone } from 'react-icons/lu';

import Button from '@/components/Button';
import { GlassPanel, glassChip } from '@/components/Admin/Glass';
import DeviceIcon from '@/components/Admin/DeviceIcon';
import { isStandalone } from '@/lib/pushFields';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { sendTestNotification } from '@/app/(admin)/admin/(protected)/_actions/push';
import { cn } from '@/lib/utils';

/**
 * "Notifications" — the per-device push switch, third in the run of device
 * lists on /admin/profile (passkeys → notifications → sessions).
 *
 * It borrows InstallDashboardCard's SELF-SUPPRESSION discipline, not its
 * markup: a device list is a GlassPanel section like its neighbours, while the
 * glass-free tile shape belongs to the install offer.
 *
 * The subscribe/unsubscribe machinery — and the four platform rules that make
 * it work on every browser the studio uses — live in
 * `src/hooks/usePushSubscription.ts`, shared with NotificationsPrompt. Read
 * that file before changing anything about how the switch behaves; every rule
 * in it fails silently in a browser.
 *
 * This card is the ONLY reconciler (`reconcile`), because it and the prompt
 * can both be mounted on this page and two of them would mean two writes and
 * two refreshes for one device.
 */

type DeviceRow = {
  id: string;
  label: string;
  iconKey: string;
  addedLabel: string;
  lastNotifiedLabel: string | null;
};

export default function NotificationsCard({
  vapidPublicKey,
  devices,
}: {
  /**
   * Read server-side and threaded down as a slim prop rather than inlined as
   * NEXT_PUBLIC_*: an inlined value is frozen at build time, so a key rotation
   * would keep serving the stale one until a redeploy. Null when push is not
   * configured for this environment — which makes the whole card vanish.
   */
  vapidPublicKey: string | null;
  devices: DeviceRow[];
}) {
  const { state, busy, turnOn, turnOffThisDevice, turnOffEverywhere } =
    usePushSubscription({
      vapidPublicKey,
      reconcile: true,
      knownDeviceCount: devices.length,
    });
  const [testing, setTesting] = useState(false);

  /**
   * The success toast deliberately does NOT say "sent" and stop there — it
   * says what to conclude if nothing shows up. The action returning ok means
   * the push service accepted it, which is genuinely all we can know from
   * here; whether the device draws it is a setting we cannot read.
   */
  async function sendTest() {
    setTesting(true);
    try {
      const res = await sendTestNotification();
      if (res?.ok) {
        toast.success(
          'Sent. The dashboard’s part worked, so if nothing appears in a few seconds, check this device’s notification settings.',
        );
      } else if (res?.error === 'no-devices') {
        toast.error('This device isn’t registered any more. Turn it off and on again here.');
      } else {
        toast.error('Couldn’t send the test. Try again.');
      }
    } catch {
      toast.error('Couldn’t send the test. Try again.');
    } finally {
      setTesting(false);
    }
  }

  // Self-suppress rather than render a control that cannot work. `checking` is
  // included so the card never flashes an "off" state it is about to correct.
  if (state === 'checking' || state === 'unsupported') return null;

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground">
          Get a nudge on this device when work is due, when something is
          assigned to you, or when a message comes in.
        </p>
      </div>

      {state === 'needs-install' && (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              glassChip,
            )}
            aria-hidden="true"
          >
            <LuSmartphone className="size-4" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            On iPhone and iPad, notifications work once the dashboard is on your
            Home Screen. Add it from the Share menu, open it from there, and
            this will offer to turn them on.
          </p>
        </div>
      )}

      {state === 'denied' && (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              glassChip,
            )}
            aria-hidden="true"
          >
            <LuBellOff className="size-4" />
          </span>
          {/* No button: once denied, requestPermission() resolves 'denied'
              immediately with no prompt, so a button here would do nothing at
              all — worse than none. Deliberately generic rather than
              per-browser instructions: a UA sniff would be wrong often enough
              to send someone into a settings screen that does not exist, and
              "a wrong claim is worse than none". */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Notifications are blocked for this site in your browser. Turn them
            back on in your browser’s settings for this site, then reload this
            page.
          </p>
        </div>
      )}

      {state === 'off' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Off on this device.
            {isStandalone() ? ' You are in the installed app.' : ''}
          </p>
          <Button
            type="button"
            size="small"
            shimmer={false}
            icon={LuBell}
            iconPosition="left"
            disabled={busy}
            onClick={turnOn}
          >
            {busy ? 'Waiting…' : 'Turn on'}
          </Button>
        </div>
      )}

      {state === 'on' && (
        <>
          <ul className="flex flex-col gap-3">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    glassChip,
                  )}
                  aria-hidden="true"
                >
                  <DeviceIcon iconKey={d.iconKey} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {d.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    On since {d.addedLabel}
                    {d.lastNotifiedLabel
                      ? ` · last notified ${d.lastNotifiedLabel}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
            {devices.length === 0 && (
              <li className="text-xs text-muted-foreground">
                On for this device.
              </li>
            )}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* FIRST, because it is the thing someone came here to do when
                notifications are "on" but nothing arrives. It goes through the
                real send path on purpose: every layer below us fails silently,
                and a device can accept a notification and still not draw it —
                so if the app icon's badge moves and nothing appears, delivery
                is fine and the device's own notification settings are not. */}
            <Button
              type="button"
              variant="secondary"
              size="small"
              icon={LuBellRing}
              iconPosition="left"
              disabled={busy || testing}
              onClick={sendTest}
            >
              {testing ? 'Sending…' : 'Send a test'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              icon={LuBellOff}
              iconPosition="left"
              disabled={busy}
              onClick={turnOffThisDevice}
            >
              Turn off here
            </Button>
            {devices.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={busy}
                onClick={turnOffEverywhere}
              >
                Turn off everywhere
              </Button>
            )}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
