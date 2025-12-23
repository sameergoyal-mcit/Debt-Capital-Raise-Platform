export interface NDATemplate {
  id: string;
  name: string;
  bodyText: string;
  version: string;
  createdAt: string;
}

export const mockNDATemplates: NDATemplate[] = [
  {
    id: "nda_std_v1",
    name: "Standard Private Credit NDA",
    version: "1.0",
    createdAt: "2024-01-01T00:00:00Z",
    bodyText: `
CONFIDENTIALITY AGREEMENT

This Confidentiality Agreement (the "Agreement") is entered into as of the date of electronic acceptance by the Recipient.

1. CONFIDENTIAL INFORMATION.
"Confidential Information" means all non-public information concerning the Borrower and its affiliates, whether written, oral, or otherwise, furnished by the Company or its Agents to the Recipient.

2. USE OF INFORMATION.
The Recipient agrees that the Confidential Information will be used solely for the purpose of evaluating a potential transaction with the Company (the "Transaction") and for no other purpose.

3. NON-DISCLOSURE.
The Recipient agrees to keep the Confidential Information confidential and not to disclose it to any third party without the prior written consent of the Company, except to its Representatives who need to know such information for the purpose of evaluating the Transaction.

4. NO REPRESENTATION OR WARRANTY.
The Recipient acknowledges that neither the Company nor its Agents makes any representation or warranty as to the accuracy or completeness of the Confidential Information.

5. TERM.
This Agreement shall remain in effect for a period of two (2) years from the date hereof.

6. GOVERNING LAW.
This Agreement shall be governed by and construed in accordance with the laws of the State of New York.

[End of Standard Template]
    `
  },
  {
    id: "nda_sponsor_v1",
    name: "Sponsor-Friendly NDA",
    version: "1.0",
    createdAt: "2024-02-15T00:00:00Z",
    bodyText: `
CONFIDENTIALITY AGREEMENT (SPONSOR FORM)

This Confidentiality Agreement (the "Agreement") is entered into as of the date of electronic acceptance.

1. DEFINITIONS.
"Confidential Information" shall mean all non-public, proprietary information disclosed by the Disclosing Party to the Recipient.

2. PERMITTED USE.
Recipient may use Confidential Information solely to evaluate the potential financing transaction. Recipient may disclose Confidential Information to its investment committee, legal counsel, and auditors ("Representatives") strictly on a need-to-know basis.

3. EXCLUSIONS.
Confidential Information does not include information that: (a) is or becomes publicly available other than as a result of a disclosure by Recipient; (b) was available to Recipient on a non-confidential basis prior to disclosure; or (c) becomes available to Recipient from a person other than Disclosing Party who is not subject to a confidentiality obligation.

4. NO SOLICIT.
Recipient agrees not to solicit key employees of the Company for a period of 12 months. General solicitations (e.g., job postings) are exempt.

5. TERMINATION.
This Agreement expires 18 months from the Effective Date.

6. JURISDICTION.
New York, NY.

[End of Sponsor Template]
    `
  }
];

export function getNDATemplate(id: string) {
  return mockNDATemplates.find(t => t.id === id);
}
