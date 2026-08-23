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


async def send_payment_link_email(
    to_email: str,
    customer_name: str,
    amount: float,
    order_type: str,
    payment_link: str,
    items_description: str = None,
    order_id: str = None
):
    """Send payment link email to customer for Pay Later orders"""
    
    # Dynamic branding based on order type
    if order_type == "lab_test":
        brand_name = "Mango Health Labs"
        brand_tagline = "by Nevika Cura"
        gradient_start = "#F97316"
        gradient_end = "#EA580C"
        accent_color = "#F97316"
        order_type_display = "Lab Test"
        # Mango Health Labs logo
        logo_url = "https://nevikacura.com/mango-logo.png"
    else:
        brand_name = "Orange Pharmacy"
        brand_tagline = "by Nevika Cura"
        gradient_start = "#F97316"
        gradient_end = "#C2410C"
        accent_color = "#EA580C"
        order_type_display = "Pharmacy Order"
        # Orange Pharmacy logo
        logo_url = "https://nevikacura.com/orange-logo.png"
    
    # Nevika Cura main logo
    nevika_logo = "https://nevikacura.com/logo.png"
    
    # Short order ID for display
    short_order_id = order_id[-8:] if order_id and len(order_id) > 8 else (order_id or "N/A")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header with Logo -->
            <tr>
                <td style="background: linear-gradient(135deg, {gradient_start} 0%, {gradient_end} 100%); padding: 25px 20px; text-align: center;">
                    <img src="{nevika_logo}" alt="Nevika Cura" style="height: 50px; margin-bottom: 10px;" onerror="this.style.display='none'">
                    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">{brand_name}</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0 0; font-size: 13px;">{brand_tagline}</p>
                </td>
            </tr>
            
            <!-- Payment Card -->
            <tr>
                <td style="padding: 25px 20px;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">
                        Dear <strong>{customer_name}</strong>,
                    </p>
                    <p style="color: #6b7280; font-size: 15px; margin: 0 0 20px 0; line-height: 1.6;">
                        Your order <strong style="color: {accent_color};">#{short_order_id}</strong> worth <strong style="color: {accent_color};">₹{amount:.2f}</strong> is ready for dispatch.
                    </p>
                    
                    <!-- Order Details Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef7ed; border-radius: 12px; margin-bottom: 20px; border: 1px solid #fed7aa;">
                        <tr>
                            <td style="padding: 18px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #9a3412; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 6px;">Order Details</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #1f2937; font-size: 15px; font-weight: 600; padding-bottom: 12px;">{order_type_display}</td>
                                    </tr>
                                    {f'''<tr>
                                        <td style="color: #6b7280; font-size: 13px; padding-bottom: 12px; line-height: 1.5;">{items_description}</td>
                                    </tr>''' if items_description else ''}
                                    <tr>
                                        <td style="border-top: 1px dashed #fdba74; padding-top: 12px;">
                                            <span style="color: #9a3412; font-size: 12px; text-transform: uppercase;">Amount to Pay</span>
                                            <div style="color: {accent_color}; font-size: 28px; font-weight: 700; margin-top: 4px;">₹{amount:.2f}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
                        Pay now using the link below for hassle-free delivery.
                    </p>
                    
                    <!-- Pay Now Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="padding: 5px 0 20px 0;">
                                <a href="{payment_link}" 
                                   style="display: inline-block; background: linear-gradient(135deg, {gradient_start} 0%, {gradient_end} 100%); 
                                          color: white; padding: 16px 50px; border-radius: 30px; text-decoration: none; 
                                          font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);">
                                    💳 Pay Now ₹{amount:.2f}
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Payment Link Text -->
                    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0 0 15px 0; word-break: break-all;">
                        Or copy this link:<br>
                        <a href="{payment_link}" style="color: {accent_color}; text-decoration: underline;">{payment_link}</a>
                    </p>
                    
                    <!-- Security Note -->
                    <div style="background: #f0fdf4; border-radius: 8px; padding: 10px 14px; margin-top: 15px; border: 1px solid #bbf7d0;">
                        <p style="color: #166534; font-size: 12px; margin: 0;">
                            🔒 <strong>Secure Payment</strong> - Powered by Cashfree. Your payment information is encrypted and secure.
                        </p>
                    </div>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background: #f9fafb; padding: 18px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                        Team Nevika Cura
                    </p>
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.6;">
                        DiaGyn • Mango Health Labs • Orange Pharmacy<br>
                        Naigaon East, Palghar | Contact: 9403890429
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    try:
        if not RESEND_API_KEY:
            logger.warning("Resend API key not configured, skipping payment link email")
            return {"success": False, "error": "Email not configured"}
        
        result = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": f"💳 Pay Now - {brand_name} Order #{short_order_id} (₹{amount:.2f})",
            "html": html_content
        })
        logger.info(f"Payment link email sent to {to_email}")
        return {"success": True, "id": result.get("id") if result else None}
        
    except Exception as e:
        logger.error(f"Failed to send payment link email: {str(e)}")
        return {"success": False, "error": str(e)}
