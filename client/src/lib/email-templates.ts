
export const emailTemplates = {
  ndaInvitation: (dealName: string, link: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #003366;">Invitation to Project ${dealName}</h2>
      <p>You have been invited to participate in the financing for <strong>${dealName}</strong>.</p>
      <p>Please review and sign the Non-Disclosure Agreement (NDA) to access the Virtual Data Room.</p>
      <p>
        <a href="${link}" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review NDA</a>
      </p>
      <p style="font-size: 12px; color: #666; margin-top: 30px;">This is a secure communication from the CapitalFlow Platform.</p>
    </div>
  `,

  ndaSigned: (dealName: string, signerName: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #003366;">NDA Executed: ${dealName}</h2>
      <p><strong>${signerName}</strong> has successfully signed the NDA for Project ${dealName}.</p>
      <p>Access to the Virtual Data Room has been granted.</p>
      <p style="font-size: 12px; color: #666; margin-top: 30px;">CapitalFlow Notification System</p>
    </div>
  `,

  newDocument: (dealName: string, docName: string, category: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #003366;">New Document Available</h2>
      <p>A new document has been uploaded to the <strong>${dealName}</strong> data room.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Document:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${docName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category}</td>
        </tr>
      </table>
      <p>Please log in to the portal to view the file.</p>
    </div>
  `,

  documentUpdated: (dealName: string, docName: string, version: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #003366;">Document Updated</h2>
      <p>A new version (<strong>${version}</strong>) of <strong>${docName}</strong> is available in the ${dealName} data room.</p>
      <p>Please review the latest changes.</p>
    </div>
  `,

  legalMarkup: (dealName: string, docName: string, uploader: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #003366;">Legal Markup Received</h2>
      <p><strong>${uploader}</strong> has uploaded comments on <strong>${docName}</strong>.</p>
      <p>Log in to the Deal Overview to review and consolidate comments.</p>
    </div>
  `,

  ioiReminder: (dealName: string, deadline: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #d9534f;">Deadline Reminder: IOI Submission</h2>
      <p>This is a reminder that Indications of Interest (IOI) for <strong>${dealName}</strong> are due by <strong>${deadline}</strong>.</p>
      <p>Please submit your preliminary grid via the portal.</p>
    </div>
  `,
  
  commitmentReminder: (dealName: string, deadline: string) => `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #d9534f;">URGENT: Commitment Deadline</h2>
      <p>Final commitments for <strong>${dealName}</strong> are due on <strong>${deadline}</strong>.</p>
      <p>Ensure all credit approvals are final before submission.</p>
    </div>
  `
};
