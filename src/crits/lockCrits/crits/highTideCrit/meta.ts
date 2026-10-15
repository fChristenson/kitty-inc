import type { CritMeta } from "../../../critKit/meta";

// a sea of coins rising up the building under the locked floor, wave after
// quickening wave slamming the lock from below until the biggest crashes over
// it and bursts it open; the tide then surges into the new floor's bar, each
// surge a payout, and drains away
export default {
  label: "High Tide",
  chance: 0.03,
  style: "money",
  // surges into the opened floor's bar, each paying it out once
  values: { payouts: 4 },
} satisfies CritMeta;
