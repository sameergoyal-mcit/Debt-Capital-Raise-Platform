export interface Bookrunner {
  id: string;
  organization: string;
  contactName: string;
  email: string;
  phone?: string;
}

export const mockBookrunners: Bookrunner[] = [
  {
    id: "br-1",
    organization: "Goldman Sachs",
    contactName: "James Mitchell",
    email: "j.mitchell@gs.com",
    phone: "+1 212-555-0101",
  },
  {
    id: "br-2",
    organization: "Morgan Stanley",
    contactName: "Amanda Chen",
    email: "a.chen@morganstanley.com",
    phone: "+1 212-555-0102",
  },
  {
    id: "br-3",
    organization: "JPMorgan Chase",
    contactName: "Robert Williams",
    email: "r.williams@jpmorgan.com",
    phone: "+1 212-555-0103",
  },
  {
    id: "br-4",
    organization: "Bank of America",
    contactName: "Sarah Thompson",
    email: "s.thompson@bofa.com",
    phone: "+1 704-555-0104",
  },
  {
    id: "br-5",
    organization: "Jefferies",
    contactName: "Michael Ross",
    email: "m.ross@jefferies.com",
    phone: "+1 212-555-0105",
  },
  {
    id: "br-6",
    organization: "RBC Capital Markets",
    contactName: "David Park",
    email: "d.park@rbc.com",
    phone: "+1 416-555-0106",
  },
  {
    id: "br-7",
    organization: "Deutsche Bank",
    contactName: "Klaus Schmidt",
    email: "k.schmidt@db.com",
    phone: "+49 69-555-0107",
  },
  {
    id: "br-8",
    organization: "Barclays",
    contactName: "Emma Wilson",
    email: "e.wilson@barclays.com",
    phone: "+44 20-555-0108",
  },
];
