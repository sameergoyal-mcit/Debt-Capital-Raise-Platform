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
    bodyText: `CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT

This Confidentiality and Non-Disclosure Agreement (the "Agreement") is entered into as of the date of electronic acceptance (the "Effective Date"), by and between the Recipient (as identified in the electronic signature block) and the Disclosing Party (the "Company").

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means all non-public, proprietary, or confidential information relating to the Company, its affiliates, or its portfolio companies, whether written, oral, encoded, or in any other tangible or intangible form, that is furnished by the Company or its Representatives to the Recipient or its Representatives, including but not limited to:
(a) Financial information, projections, business plans, and strategies;
(b) Information regarding the Company's capital structure, debt, equity, and potential financing transactions;
(c) Customer lists, supplier lists, and operational data;
(d) Intellectual property, trade secrets, and technical data;
(e) The fact that the Confidential Information has been made available to the Recipient, that discussions or negotiations are taking place concerning a Transaction, or any of the terms, conditions, or other facts with respect to any such Transaction.

2. USE OF CONFIDENTIAL INFORMATION
The Recipient agrees that the Confidential Information will be used solely for the purpose of evaluating a potential credit or investment transaction with the Company (the "Transaction") and for no other purpose. The Recipient shall not use the Confidential Information in any way that is detrimental to the Company or for the benefit of any third party.

3. NON-DISCLOSURE OBLIGATIONS
The Recipient agrees to keep the Confidential Information strictly confidential and shall not disclose such information to any third party without the prior written consent of the Company, except that the Recipient may disclose the Confidential Information to its directors, officers, employees, partners, members, agents, advisors, and affiliates (collectively, "Representatives") who:
(a) Need to know such information for the purpose of evaluating the Transaction;
(b) Are informed by the Recipient of the confidential nature of the Information; and
(c) Are directed by the Recipient to treat such information confidentially in accordance with the terms of this Agreement.
The Recipient shall be responsible for any breach of this Agreement by its Representatives.

4. EXCLUSIONS
The term "Confidential Information" does not include information that:
(a) Is or becomes generally available to the public other than as a result of a disclosure by the Recipient or its Representatives in violation of this Agreement;
(b) Was available to the Recipient on a non-confidential basis prior to its disclosure by the Company;
(c) Becomes available to the Recipient on a non-confidential basis from a person other than the Company or its Representatives who is not known by the Recipient to be bound by a confidentiality agreement with the Company; or
(d) Is independently developed by the Recipient without use of or reference to the Confidential Information.

5. COMPELLED DISCLOSURE
In the event that the Recipient or any of its Representatives is requested or required (by oral questions, interrogatories, requests for information or documents, subpoena, civil investigative demand, or similar process) to disclose any Confidential Information, the Recipient agrees to provide the Company with prompt notice of such request(s) so that the Company may seek an appropriate protective order or other appropriate remedy and/or waive the Recipient's compliance with the provisions of this Agreement.

6. NO REPRESENTATION OR WARRANTY
The Recipient acknowledges and agrees that neither the Company nor its Representatives makes any representation or warranty, express or implied, as to the accuracy or completeness of the Confidential Information. The Recipient agrees that neither the Company nor its Representatives shall have any liability to the Recipient or to any of its Representatives resulting from the use of the Confidential Information.

7. RETURN OR DESTRUCTION OF INFORMATION
Upon the written request of the Company, the Recipient shall promptly (and in any event within ten (10) business days) return to the Company or destroy all copies of the Confidential Information in its possession or control, and shall certify in writing to the Company that such destruction has occurred. Notwithstanding the foregoing, the Recipient may retain copies of the Confidential Information to the extent required by law, regulation, or its internal document retention policies, provided that such retained information shall remain subject to the confidentiality obligations of this Agreement.

8. NON-SOLICITATION
For a period of one (1) year from the date hereof, the Recipient agrees not to directly or indirectly solicit for employment or hire any employee of the Company with whom the Recipient has had contact or who became known to the Recipient in connection with the Transaction; provided, however, that this restriction shall not apply to general solicitations of employment not specifically directed toward employees of the Company.

9. TERM
This Agreement and the obligations hereunder shall terminate two (2) years from the Effective Date.

10. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without giving effect to any choice of law or conflict of law rules or provisions. The parties hereby submit to the exclusive jurisdiction of the federal or state courts located in the Borough of Manhattan, New York, for any dispute arising out of or relating to this Agreement.

11. MISCELLANEOUS
(a) This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof.
(b) No failure or delay by the Company in exercising any right, power, or privilege hereunder shall operate as a waiver thereof.
(c) This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument.
(d) This Agreement may be accepted via electronic signature or "click-through" acceptance, which shall be binding as an original signature.

[End of Standard Private Credit NDA]`
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
