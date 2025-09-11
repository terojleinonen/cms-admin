export async function sendPasswordResetEmail(email: string, token: string) {
  // In a real app, you would use a transactional email service like Postmark, SendGrid, or AWS SES.
  // For this example, we'll just log the email to the console.
  console.log(`Sending password reset email to ${email} with token ${token}`);
  return Promise.resolve();
}
