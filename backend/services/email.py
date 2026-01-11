"""
Nevika Cura - Email Service
Send email notifications using Resend API
"""

import os
import logging
import resend

logger = logging.getLogger(__name__)

# Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFICATION_EMAIL = os.environ.get("NOTIFICATION_EMAIL", "nevikacura@gmail.com")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Nevika Cura <noreply@nevikacura.com>")

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend API initialized")

async def send_email_notification(
    subject: str,
    html_content: str,
    patient_email: str = None,
    patient_subject: str = None,
    patient_html: str = None
):
    """
    Send email notification to admin and optionally to patient
    
    Args:
        subject: Email subject for admin
        html_content: HTML content for admin email
        patient_email: Optional patient email address
        patient_subject: Optional subject for patient email
        patient_html: Optional HTML content for patient email
    """
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping email")
        return {"success": False, "error": "Email not configured"}
    
    try:
        # Send to admin
        admin_result = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [NOTIFICATION_EMAIL],
            "subject": subject,
            "html": html_content
        })
        logger.info(f"Admin email sent successfully: {subject}")
        
        # Send to patient if provided
        if patient_email and patient_subject and patient_html:
            patient_result = resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": [patient_email],
                "subject": patient_subject,
                "html": patient_html
            })
            logger.info(f"Patient email sent to {patient_email}: {patient_subject}")
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return {"success": False, "error": str(e)}

async def send_credentials_email(
    to_email: str,
    staff_name: str,
    username: str,
    password: str,
    role: str,
    portal_url: str
):
    """Send login credentials to new staff member"""
    
    html_content = f"""
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Nevika Cura!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>{staff_name}</strong>,</p>
            <p>Your staff account has been created. Here are your login credentials:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
                <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="{portal_url}">{portal_url}</a></p>
                <p style="margin: 5px 0;"><strong>Username:</strong> {username}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> {password}</p>
                <p style="margin: 5px 0;"><strong>Role:</strong> {role}</p>
            </div>
            
            <p style="color: #ef4444; font-weight: bold;">⚠️ Please change your password after first login.</p>
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                If you have any issues, please contact the administrator.
            </p>
        </div>
    </div>
    """
    
    return await send_email_notification(
        subject=f"New Staff Account Created - {staff_name}",
        html_content=f"Staff account created for {staff_name} ({role})",
        patient_email=to_email,
        patient_subject="Your Nevika Cura Staff Login Credentials",
        patient_html=html_content
    )
