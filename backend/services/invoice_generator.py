"""
Professional Invoice PDF Generator
Generates beautiful A4 invoices for all Nevika Cura services:
- Nevika Cura (Subscriptions)
- DiaGyn (Appointments)
- Orange Pharmacy (Medicine Orders)
- Mango Health Labs (Diagnostics)

Modern design inspired by Blinkit/Zepto receipts
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Line
from io import BytesIO
from datetime import datetime
from pathlib import Path
import os
import base64
import logging

logger = logging.getLogger(__name__)

# Logo paths
LOGO_DIR = Path(__file__).parent.parent / "assets" / "logos"
SERVICE_LOGOS = {
    "nevika": LOGO_DIR / "nevika_cura.png",
    "diagyn": LOGO_DIR / "diagyn_healthcare.png",
    "orange": LOGO_DIR / "orange_pharmacy.png",
    "mango": LOGO_DIR / "mango_health_labs.png"
}

# Service-specific color themes
SERVICE_THEMES = {
    "nevika": {
        "primary": "#0D9488",      # Teal
        "secondary": "#14B8A6",
        "accent": "#5EEAD4",
        "text": "#134E4A",
        "name": "Nevika Cura",
        "tagline": "Your Complete Healthcare Partner"
    },
    "diagyn": {
        "primary": "#0D9488",      # Teal/Blue
        "secondary": "#14B8A6",
        "accent": "#5EEAD4",
        "text": "#134E4A",
        "name": "DiaGyn Healthcare",
        "tagline": "Expert Women's Health & Diabetes Care"
    },
    "orange": {
        "primary": "#F59E0B",      # Orange/Amber
        "secondary": "#F97316",
        "accent": "#FDBA74",
        "text": "#7C2D12",
        "name": "Orange Pharmacy",
        "tagline": "Your Trusted Medicine Partner"
    },
    "mango": {
        "primary": "#16A34A",      # Green
        "secondary": "#22C55E",
        "accent": "#86EFAC",
        "text": "#14532D",
        "name": "Mango Health Labs",
        "tagline": "A Nevika Cura Healthcare unit"
    }
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

class InvoiceGenerator:
    """Generates professional PDF invoices"""
    
    def __init__(self, service_type: str = "nevika"):
        self.service_type = service_type.lower()
        self.theme = SERVICE_THEMES.get(self.service_type, SERVICE_THEMES["nevika"])
        self.primary_color = colors.Color(*hex_to_rgb(self.theme["primary"]))
        self.secondary_color = colors.Color(*hex_to_rgb(self.theme["secondary"]))
        self.accent_color = colors.Color(*hex_to_rgb(self.theme["accent"]))
        self.text_color = colors.Color(*hex_to_rgb(self.theme["text"]))
        self.logo_path = SERVICE_LOGOS.get(self.service_type, SERVICE_LOGOS["nevika"])
        
    def generate_invoice(self, invoice_data: dict) -> bytes:
        """Generate a complete PDF invoice
        
        Args:
            invoice_data: Dictionary containing:
                - invoice_number: str
                - date: str
                - patient_name: str
                - patient_phone: str
                - patient_email: str (optional)
                - items: list of dicts with name, quantity, price, total
                - subtotal: float
                - discount: float (optional)
                - total: float
                - payment_status: str (paid/pending)
                - payment_method: str (optional)
                - clinic_name: str (for DiaGyn)
                - doctor_name: str (for DiaGyn)
                - lab_technician: str (for Mango)
                - delivery_address: str (for Orange)
                - notes: str (optional)
                
        Returns:
            PDF file as bytes
        """
        buffer = BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15*mm,
            leftMargin=15*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )
        
        # Build the content
        story = []
        
        # Header with logo and branding
        story.extend(self._build_header(invoice_data))
        
        # Invoice details section
        story.extend(self._build_invoice_details(invoice_data))
        
        # Items table
        story.extend(self._build_items_table(invoice_data))
        
        # Totals section
        story.extend(self._build_totals(invoice_data))
        
        # Payment status badge
        story.extend(self._build_payment_status(invoice_data))
        
        # Additional info (doctor, clinic, etc.)
        story.extend(self._build_additional_info(invoice_data))
        
        # Footer
        story.extend(self._build_footer(invoice_data))
        
        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _build_header(self, invoice_data: dict) -> list:
        """Build the invoice header with branding (text only)"""
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Heading1'],
            fontSize=26,
            textColor=self.primary_color,
            alignment=TA_LEFT,
            spaceAfter=2*mm,
            fontName='Helvetica-Bold'
        )
        
        tagline_style = ParagraphStyle(
            'TaglineStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            alignment=TA_LEFT
        )
        
        invoice_title_style = ParagraphStyle(
            'InvoiceTitleStyle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=self.primary_color,
            alignment=TA_RIGHT,
            spaceAfter=5*mm,
            fontName='Helvetica-Bold'
        )
        
        # Text-only header (no logo)
        header_data = [
            [
                Paragraph(f"<b>{self.theme['name']}</b>", header_style),
                Paragraph("<b>INVOICE</b>", invoice_title_style)
            ],
            [
                Paragraph(self.theme['tagline'], tagline_style),
                ""
            ]
        ]
        
        header_table = Table(header_data, colWidths=[100*mm, 80*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 5*mm))
        
        # Colored divider line
        elements.append(HRFlowable(
            width="100%",
            thickness=3,
            color=self.primary_color,
            spaceBefore=2*mm,
            spaceAfter=5*mm
        ))
        
        return elements
    
    def _build_invoice_details(self, invoice_data: dict) -> list:
        """Build invoice details section"""
        elements = []
        styles = getSampleStyleSheet()
        
        label_style = ParagraphStyle(
            'LabelStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray
        )
        
        value_style = ParagraphStyle(
            'ValueStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black
        )
        
        bold_value_style = ParagraphStyle(
            'BoldValueStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        )
        
        # Format date
        invoice_date = invoice_data.get('date', datetime.now().strftime('%d %b %Y'))
        
        # Left column: Bill To
        bill_to = [
            [Paragraph("BILL TO", label_style)],
            [Paragraph(f"<b>{invoice_data.get('patient_name', 'Customer')}</b>", bold_value_style)],
            [Paragraph(invoice_data.get('patient_phone', ''), value_style)],
        ]
        if invoice_data.get('patient_email'):
            bill_to.append([Paragraph(invoice_data['patient_email'], value_style)])
        if invoice_data.get('delivery_address'):
            bill_to.append([Spacer(1, 2*mm)])
            bill_to.append([Paragraph(invoice_data['delivery_address'], value_style)])
        
        bill_to_table = Table(bill_to, colWidths=[85*mm])
        
        # Right column: Invoice Details
        invoice_details = [
            [Paragraph("INVOICE NUMBER", label_style)],
            [Paragraph(f"<b>{invoice_data.get('invoice_number', 'INV-0001')}</b>", bold_value_style)],
            [Spacer(1, 3*mm)],
            [Paragraph("DATE", label_style)],
            [Paragraph(invoice_date, value_style)],
        ]
        
        invoice_details_table = Table(invoice_details, colWidths=[85*mm])
        
        # Combine both columns
        details_row = Table(
            [[bill_to_table, invoice_details_table]],
            colWidths=[95*mm, 85*mm]
        )
        details_row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(details_row)
        elements.append(Spacer(1, 8*mm))
        
        return elements
    
    def _build_items_table(self, invoice_data: dict) -> list:
        """Build the items/services table"""
        elements = []
        styles = getSampleStyleSheet()
        
        # Table header style
        header_style = ParagraphStyle(
            'TableHeaderStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            fontName='Helvetica-Bold'
        )
        
        # Table cell styles
        cell_style = ParagraphStyle(
            'CellStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black
        )
        
        cell_right_style = ParagraphStyle(
            'CellRightStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            alignment=TA_RIGHT
        )
        
        # Build table data
        table_data = [
            [
                Paragraph("ITEM", header_style),
                Paragraph("QTY", header_style),
                Paragraph("PRICE", header_style),
                Paragraph("TOTAL", header_style)
            ]
        ]
        
        items = invoice_data.get('items', [])
        for item in items:
            table_data.append([
                Paragraph(item.get('name', item.get('item_name', 'Item')), cell_style),
                Paragraph(str(item.get('quantity', 1)), cell_style),
                Paragraph(f"₹{item.get('price', item.get('unit_price', 0)):,.2f}", cell_right_style),
                Paragraph(f"₹{item.get('total', item.get('net_total', 0)):,.2f}", cell_right_style)
            ])
        
        # Create table
        items_table = Table(
            table_data,
            colWidths=[90*mm, 25*mm, 30*mm, 35*mm]
        )
        
        # Style the table
        table_style = [
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), self.primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            
            # Alignment
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.9, 0.9, 0.9)),
            ('BOX', (0, 0), (-1, -1), 1, self.primary_color),
        ]
        
        items_table.setStyle(TableStyle(table_style))
        
        elements.append(items_table)
        elements.append(Spacer(1, 5*mm))
        
        return elements
    
    def _build_totals(self, invoice_data: dict) -> list:
        """Build the totals section"""
        elements = []
        styles = getSampleStyleSheet()
        
        label_style = ParagraphStyle(
            'TotalLabelStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            alignment=TA_RIGHT
        )
        
        value_style = ParagraphStyle(
            'TotalValueStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )
        
        grand_total_style = ParagraphStyle(
            'GrandTotalStyle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=self.primary_color,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )
        
        # Build totals data
        totals_data = []
        
        subtotal = invoice_data.get('subtotal', invoice_data.get('total', 0))
        totals_data.append([
            Paragraph("Subtotal", label_style),
            Paragraph(f"₹{subtotal:,.2f}", value_style)
        ])
        
        discount = invoice_data.get('discount', 0) + invoice_data.get('loyalty_discount', 0)
        if discount > 0:
            totals_data.append([
                Paragraph("Discount", label_style),
                Paragraph(f"-₹{discount:,.2f}", value_style)
            ])
        
        total = invoice_data.get('total', invoice_data.get('final_total', subtotal - discount))
        totals_data.append([
            Paragraph("<b>TOTAL</b>", label_style),
            Paragraph(f"<b>₹{total:,.2f}</b>", grand_total_style)
        ])
        
        # Right-aligned totals table
        totals_table = Table(
            totals_data,
            colWidths=[130*mm, 50*mm]
        )
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEABOVE', (0, -1), (-1, -1), 1, self.primary_color),
        ]))
        
        elements.append(totals_table)
        elements.append(Spacer(1, 5*mm))
        
        return elements
    
    def _build_payment_status(self, invoice_data: dict) -> list:
        """Build payment status badge"""
        elements = []
        styles = getSampleStyleSheet()
        
        status = invoice_data.get('payment_status', 'pending').upper()
        payment_method = invoice_data.get('payment_method', '')
        
        if status == 'PAID':
            badge_color = colors.Color(0.13, 0.77, 0.37)  # Green
            badge_text = "PAID"
        elif status == 'PARTIAL':
            badge_color = colors.Color(0.96, 0.62, 0.04)  # Orange
            badge_text = "PARTIAL PAYMENT"
        else:
            badge_color = colors.Color(0.95, 0.33, 0.19)  # Red
            badge_text = "PAYMENT PENDING"
        
        badge_style = ParagraphStyle(
            'BadgeStyle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.white,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Create badge table
        badge_data = [[Paragraph(badge_text, badge_style)]]
        if payment_method and status == 'PAID':
            method_style = ParagraphStyle(
                'MethodStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.white,
                alignment=TA_CENTER
            )
            badge_data.append([Paragraph(f"via {payment_method.upper()}", method_style)])
        
        badge_table = Table(badge_data, colWidths=[80*mm])
        badge_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), badge_color),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('ROUNDRECT', (0, 0), (-1, -1), 5),
        ]))
        
        # Center the badge
        wrapper = Table([[badge_table]], colWidths=[180*mm])
        wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        
        elements.append(wrapper)
        elements.append(Spacer(1, 8*mm))
        
        return elements
    
    def _build_additional_info(self, invoice_data: dict) -> list:
        """Build additional information section based on service type"""
        elements = []
        styles = getSampleStyleSheet()
        
        info_label_style = ParagraphStyle(
            'InfoLabelStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray
        )
        
        info_value_style = ParagraphStyle(
            'InfoValueStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black
        )
        
        info_items = []
        
        # Service-specific info
        if self.service_type == 'diagyn':
            if invoice_data.get('clinic_name'):
                info_items.append(("Clinic", invoice_data['clinic_name']))
            if invoice_data.get('doctor_name'):
                info_items.append(("Doctor", invoice_data['doctor_name']))
        
        elif self.service_type == 'mango':
            info_items.append(("NABL Accreditation", "MC-5678"))
            if invoice_data.get('lab_technician'):
                info_items.append(("Lab Technician", invoice_data['lab_technician']))
            if invoice_data.get('sample_collected_at'):
                info_items.append(("Sample Collected", invoice_data['sample_collected_at']))
        
        elif self.service_type == 'orange':
            # Pharmacy compliance info
            info_items.append(("Drug License No.", "DL-20B/21B-MH-2024/001234"))
            info_items.append(("FSSAI License", "11524037000123"))
            if invoice_data.get('delivery_partner'):
                info_items.append(("Delivered By", invoice_data['delivery_partner']))
            if invoice_data.get('delivery_time'):
                info_items.append(("Delivered At", invoice_data['delivery_time']))
        
        # Notes
        if invoice_data.get('notes'):
            info_items.append(("Notes", invoice_data['notes']))
        
        if info_items:
            # Colored section header
            section_header_style = ParagraphStyle(
                'SectionHeaderStyle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=self.primary_color,
                fontName='Helvetica-Bold',
                spaceAfter=3*mm
            )
            
            elements.append(Paragraph("Additional Information", section_header_style))
            
            info_data = []
            for label, value in info_items:
                info_data.append([
                    Paragraph(label, info_label_style),
                    Paragraph(str(value), info_value_style)
                ])
            
            info_table = Table(info_data, colWidths=[40*mm, 140*mm])
            info_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            
            elements.append(info_table)
            elements.append(Spacer(1, 5*mm))
        
        return elements
    
    def _build_footer(self, invoice_data: dict) -> list:
        """Build the footer section"""
        elements = []
        styles = getSampleStyleSheet()
        
        # Divider
        elements.append(HRFlowable(
            width="100%",
            thickness=1,
            color=colors.Color(0.9, 0.9, 0.9),
            spaceBefore=5*mm,
            spaceAfter=5*mm
        ))
        
        footer_style = ParagraphStyle(
            'FooterStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray,
            alignment=TA_CENTER
        )
        
        thank_you_style = ParagraphStyle(
            'ThankYouStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=self.primary_color,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        elements.append(Paragraph(f"Thank you for choosing {self.theme['name']}!", thank_you_style))
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("This is a computer-generated invoice. No signature required.", footer_style))
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph("For queries, contact: nevikacura@gmail.com | +91 9833188288", footer_style))
        elements.append(Spacer(1, 2*mm))
        
        # Service-specific compliance footer
        if self.service_type == 'orange':
            elements.append(Paragraph("Drug License: DL-20B/21B-MH-2024/001234 | FSSAI: 11524037000123", footer_style))
        elif self.service_type == 'mango':
            elements.append(Paragraph("NABL Accredited Lab | Quality Assured Diagnostics", footer_style))
        else:
            elements.append(Paragraph("Registered Healthcare Provider", footer_style))
        
        return elements


def generate_invoice_pdf(invoice_data: dict, service_type: str = "nevika") -> bytes:
    """Convenience function to generate invoice PDF
    
    Args:
        invoice_data: Invoice data dictionary
        service_type: One of 'nevika', 'diagyn', 'orange', 'mango'
    
    Returns:
        PDF file as bytes
    """
    generator = InvoiceGenerator(service_type)
    return generator.generate_invoice(invoice_data)


def save_invoice_pdf(invoice_data: dict, service_type: str, save_path: str) -> str:
    """Generate and save invoice PDF to file
    
    Args:
        invoice_data: Invoice data dictionary
        service_type: Service type
        save_path: Path to save the PDF
    
    Returns:
        Path to saved file
    """
    pdf_bytes = generate_invoice_pdf(invoice_data, service_type)
    
    with open(save_path, 'wb') as f:
        f.write(pdf_bytes)
    
    return save_path


def get_invoice_base64(invoice_data: dict, service_type: str = "nevika") -> str:
    """Generate invoice PDF and return as base64 string
    
    Args:
        invoice_data: Invoice data dictionary
        service_type: Service type
    
    Returns:
        Base64 encoded PDF string
    """
    pdf_bytes = generate_invoice_pdf(invoice_data, service_type)
    return base64.b64encode(pdf_bytes).decode('utf-8')
