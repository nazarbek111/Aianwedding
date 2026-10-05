export type Invitee = {
  id: string;
  token: string;
  name: string;
  maxGuests: number;
};

export type Rsvp = {
  id: string;
  inviteeId: string | null;
  guest: string;
  attending: boolean;
  guests: string[];
  createdAt: string;
  updatedAt: string;
};

export type NewRsvp = Omit<Rsvp, 'id' | 'createdAt' | 'updatedAt'>;
export type EditableRsvp = Pick<Rsvp, 'guest' | 'attending' | 'guests' | 'inviteeId'>;
export type NewInvitee = Omit<Invitee, 'id'>;

export interface RsvpStore {
  listInvitees(): Promise<Invitee[]>;
  getInviteeByToken(token: string): Promise<Invitee | null>;
  addInvitees(invitees: NewInvitee[]): Promise<Invitee[]>;
  listRsvps(): Promise<Rsvp[]>;
  getRsvpByInvitee(inviteeId: string): Promise<Rsvp | null>;
  upsertRsvp(rsvp: NewRsvp): Promise<Rsvp>;
  updateRsvp(id: string, changes: EditableRsvp): Promise<Rsvp | null>;
  deleteRsvp(id: string): Promise<boolean>;
}
