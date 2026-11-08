/**
 * The cancellation lines the tour, activity, package and transfer pages show: written from the owner's per-booking
 * rule (site.legal.cancellation, the Legal details checklist of 8 Nov 2026, item 4), the same rule the Terms &
 * Conditions set out in section 3, so a page and the terms can never disagree. Notice counts back from the scheduled
 * departure, activity or pickup time, Cape Town time.
 */
import { site } from './site.mjs';

const C = site.legal.cancellation;

/** After the notice period: the owner's charge, and the no-show charge (one sentence when they are the same). */
const after =
  C.lateCharge === C.noShowCharge
    ? `After that, and for no-shows, ${C.lateCharge}% of the price is charged.`
    : `After that, ${C.lateCharge}% of the price is charged, and ${C.noShowCharge}% for a no-show.`;

export const CANCELLATION = Object.freeze({
  /** Day tours (and the Private Cape Town Experience, a day planned around the group). */
  day: `Free cancellation up to ${C.dayTour} hours before the scheduled departure time. ${after}`,
  /** Partner activities: shark cage diving, sky diving, quad biking. */
  activity: `Free cancellation up to ${C.activity} hours before your scheduled activity. ${after}`,
  /** The Garden Route, the multi-day tour. */
  multiDay: `Free cancellation up to ${C.multiDay} hours before departure. ${after}`,
  /** Airport and other transfers. */
  transfer: `Free cancellation up to ${C.transfer} hours before your scheduled pickup time. ${after}`,
});
