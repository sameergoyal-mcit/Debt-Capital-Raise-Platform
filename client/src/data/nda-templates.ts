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
    bodyText: `CONFIDENTIALITY AGREEMENT

This Confidentiality Agreement (“Agreement”) is entered into as of [DATE] by and between:

[Borrower / Issuer Legal Name], together with its affiliates (“Company”),
and
[Lender Legal Name] (“Recipient”).

Purpose

Recipient desires to evaluate a potential debt financing transaction involving the Company (the “Transaction”) and, in connection therewith, may receive confidential and proprietary information.

Confidential Information

“Confidential Information” includes all non-public information relating to the Company or the Transaction, including:

lender presentation materials

financial statements and projections

legal documentation

models and analyses

data room materials

Exclusions

Confidential Information does not include information that:

is or becomes public other than through a breach

is independently developed without reference to Confidential Information

is received from a third party not under confidentiality obligations

Use of Information

Recipient agrees to use Confidential Information solely for the purpose of evaluating the Transaction and not for any other purpose.

Disclosure

Recipient may disclose Confidential Information only to its representatives who have a need to know and are bound by confidentiality obligations at least as restrictive as this Agreement.

No Contact / No Reliance

Recipient agrees not to contact the Company’s employees, customers, or suppliers without prior written consent.
All information is provided “as is” without representation or warranty.

Return or Destruction

Upon request, Recipient shall promptly return or destroy all Confidential Information.

Term

This Agreement shall remain in effect for two (2) years from the date hereof.

Governing Law

This Agreement shall be governed by the laws of the State of New York.`
  },
  {
    id: "nda_sponsor_v1",
    name: "Sponsor-Friendly NDA",
    version: "1.0",
    createdAt: "2024-02-15T00:00:00Z",
    bodyText: `CONFIDENTIALITY AGREEMENT (SPONSOR FORM)

This Confidentiality Agreement (the "Agreement") is entered into as of the date of electronic acceptance, by and between the Recipient and the Disclosing Party.

1. DEFINITIONS
"Confidential Information" shall mean all non-public, proprietary information disclosed by the Disclosing Party to the Recipient in connection with the potential financing transaction (the "Transaction").

2. PERMITTED USE AND DISCLOSURE
Recipient may use Confidential Information solely to evaluate the Transaction. Recipient may disclose Confidential Information to its investment committee, legal counsel, auditors, and other advisors ("Representatives") strictly on a need-to-know basis, provided such Representatives are bound by confidentiality obligations at least as restrictive as those contained herein.

3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION
Confidential Information does not include information that: (a) is or becomes publicly available other than as a result of a disclosure by Recipient; (b) was available to Recipient on a non-confidential basis prior to disclosure; (c) becomes available to Recipient from a person other than Disclosing Party who is not subject to a confidentiality obligation; or (d) is independently developed by Recipient.

4. NO SOLICITATION OF EMPLOYEES
Recipient agrees not to solicit key employees of the Company for a period of twelve (12) months from the date hereof. This restriction shall not apply to: (a) general solicitations (e.g., job postings) not specifically directed at Company employees; or (b) hiring of employees who approach Recipient on their own initiative.

5. NO OBLIGATION TO PROCEED
Unless and until a definitive agreement concerning the Transaction has been executed and delivered, neither party shall be under any legal obligation with respect to the Transaction by virtue of this Agreement except for the rights and obligations specifically agreed to herein.

6. TERMINATION
This Agreement and the obligations hereunder shall expire eighteen (18) months from the Effective Date.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the State of New York.

[End of Sponsor Template]`
  }
];

export function getNDATemplate(id: string) {
  return mockNDATemplates.find(t => t.id === id);
}
