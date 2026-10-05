import type { Invitee, Rsvp } from './store/types';

export function calculateStats(invitees: Invitee[], rsvps: Rsvp[]) {
  const byInvitee = new Map(rsvps.filter(rsvp => rsvp.inviteeId).map(rsvp => [rsvp.inviteeId as string, rsvp]));
  const answeredInviteeIds = new Set(byInvitee.keys());
  const unanswered = invitees.filter(invitee => !answeredInviteeIds.has(invitee.id));
  const attending = rsvps.filter(rsvp => rsvp.attending);
  const invitedResponses: Rsvp[] = [];
  byInvitee.forEach(rsvp => invitedResponses.push(rsvp));
  return {
    invited: invitees.length,
    answered: invitedResponses.length,
    attending: invitedResponses.filter(rsvp => rsvp.attending).length,
    totalGuests: attending.reduce((sum, rsvp) => sum + rsvp.guests.length, 0),
    declined: invitedResponses.filter(rsvp => !rsvp.attending).length,
    unanswered,
  };
}
