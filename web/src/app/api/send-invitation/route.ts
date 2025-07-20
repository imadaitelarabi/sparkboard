import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * Email invitation API route using Resend
 * 
 * Required environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Sender email (defaults to "SparkBoard <noreply@sparkboard.app>")
 */

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const { 
      invitationId, 
      recipientEmail, 
      inviterName, 
      resourceName, 
      resourceType, 
      inviteUrl 
    } = await request.json()

    if (!resend) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service not configured' }, 
        { status: 500 }
      )
    }

    const subject = `${inviterName} invited you to collaborate on ${resourceType === 'project' ? 'project' : 'board'}: ${resourceName}`
    
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">SparkBoard Invitation</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Collaborative whiteboard for project management</p>
        </div>
        
        <div style="background: #fafbff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 15px 0; color: #2d3748; font-size: 20px;">You're invited to collaborate!</h2>
          <p style="margin: 0 0 15px 0; color: #475569; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to collaborate on the ${resourceType} 
            <strong>"${resourceName}"</strong> on SparkBoard.
          </p>
          <p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6;">
            ${resourceType === 'project' 
              ? 'You\'ll have access to all whiteboards and task boards within this project.' 
              : 'You\'ll be able to view and collaborate on the selected boards.'}
          </p>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);">
              Accept Invitation
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">
            If you can't click the button, copy and paste this link into your browser:
          </p>
          <p style="margin: 5px 0 0 0; word-break: break-all;">
            <a href="${inviteUrl}" style="color: #6366f1; text-decoration: none;">${inviteUrl}</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">This invitation was sent via SparkBoard. If you believe this was sent in error, you can safely ignore this email.</p>
        </div>
      </div>
    `

    const emailText = `
      ${inviterName} invited you to collaborate on ${resourceType}: ${resourceName}
      
      ${resourceType === 'project' 
        ? 'You\'ll have access to all whiteboards and task boards within this project.' 
        : 'You\'ll be able to view and collaborate on the selected boards.'}
      
      Accept the invitation: ${inviteUrl}
      
      If you can't click the link, copy and paste it into your browser.
    `

    const { data, error } = await resend!.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SparkBoard <noreply@sparkboard.app>',
      to: [recipientEmail],
      subject,
      html: emailHtml,
      text: emailText,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error }, 
        { status: 500 }
      )
    }

    console.log('Email sent successfully:', data)
    return NextResponse.json({ success: true, emailId: data?.id })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation email', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}