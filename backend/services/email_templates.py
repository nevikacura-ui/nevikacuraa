"""
Nevika Cura — Premium Email Templates (Light, brand-oriented)
Uses custom brand illustrations as hero images.
Force light mode in Gmail/Outlook dark mode.
"""

# ═══════════════════════════════════════════
# BRAND LOGO URLs
# ═══════════════════════════════════════════
LOGO_NEVIKA_CURA = "https://customer-assets.emergentagent.com/job_751dde3d-d15f-4912-b0d6-ce72259bb29f/artifacts/lpwfnyto_6841-removebg-preview.png"
LOGO_DIAGYN = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/13v9ngkp_5_20260311_124451_0004.png"
LOGO_ORANGE_PHARMACY = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/c2fcemnx_4_20260311_124451_0003.png"
LOGO_MANGO_LABS = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/28cub72l_Add%20a%20subheading_20260311_123952_0000.png"
LOGO_CURAPAY = "https://customer-assets.emergentagent.com/job_01733c5e-6170-4599-b958-d3155c19b432/artifacts/7ghwsms8_file_00000000ca5c7208bdd5e559e8f91fba.png"

# Custom brand illustrations (user-provided)
ILLUST_DIAGYN = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/ytuf99xa_file_0000000032347208b797968ac0c21724%20%281%29.png"
ILLUST_DIAGYN_CANCELLED = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/b06kaz3p_file_00000000d9207208b388df3ac53c434a%20%281%29.png"
ILLUST_MANGO = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/3juag7l2_file_00000000b3a47208abf30ec522a5a77c%20%281%29.png"
# Nevika Cura — subscription illustration
ILLUST_SUBSCRIPTION = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/ms24ahea_file_0000000026f072088779c36f090df30c%20%281%29.png"

# Staff Email Banners — dual-branded logos (service + Nevika Cura)
STAFF_BANNER_DIAGYN = "https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/32egst99_file_00000000a6c07208b6fc7854e26e2fd8%20%281%29.png"
STAFF_BANNER_ORANGE = "https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/hjzeajhx_file_00000000627872089603baaf5714f33c%20%281%29.png"
STAFF_BANNER_MANGO = "https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/6r5klez6_file_00000000a7ec7208bf231a6f05185278%20%281%29.png"
STAFF_BANNER_PORTAL = "https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/18s8zc2y_Untitled%20design_20260325_105925_0000%20%281%29.png"

STAFF_BANNER = {
    "diagyn": STAFF_BANNER_DIAGYN,
    "mango": STAFF_BANNER_MANGO,
    "orange": STAFF_BANNER_ORANGE,
    "portal": STAFF_BANNER_PORTAL,
}

# Mango Labs — status-specific illustrations
ILLUST_MANGO_SAMPLE_COLLECTED = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/ik9ipqte_file_00000000b3a47208abf30ec522a5a77c%20%282%29.png"
ILLUST_MANGO_IN_PROCESS = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/thtytmci_file_00000000f41c72089af9464158f613b8%20%282%29.png"
ILLUST_MANGO_REPORT_READY = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/p71d1ev6_file_00000000f41c72089af9464158f613b8%20%281%29.png"

# Orange Pharmacy — status-specific illustrations
ILLUST_ORANGE_CONFIRMED = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/axwdiz8o_file_000000008fac7208a2d6cc906ba847c5%20%282%29.png"
ILLUST_ORANGE_PACKING = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/k9j77mvh_file_000000008fac7208a2d6cc906ba847c5%20%281%29.png"
ILLUST_ORANGE_OUT_FOR_DELIVERY = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/74ofruv5_file_0000000000cc7208abd154bee5224be1%20%281%29.png"
ILLUST_ORANGE_DELIVERED = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/w4j67hug_file_0000000000cc7208abd154bee5224be1%20%282%29.png"

# ═══════════════════════════════════════════
# PROMOTIONAL AD BANNERS (per-brand)
# ═══════════════════════════════════════════
PROMO_BANNER = {
    "diagyn":  "https://customer-assets.emergentagent.com/job_9cfe3b92-9f02-470f-8570-d7b3a1e09624/artifacts/vk1f6s8g_file_0000000044b47208a2c6734ad4006f31.png",
    "mango":   "https://customer-assets.emergentagent.com/job_9cfe3b92-9f02-470f-8570-d7b3a1e09624/artifacts/mh7nun18_file_0000000017b472089c67029e56efa749.png",
    "orange":  "https://customer-assets.emergentagent.com/job_9cfe3b92-9f02-470f-8570-d7b3a1e09624/artifacts/gax36021_file_00000000b7f07208916e04a1501a6631.png",
    "portal":  "https://customer-assets.emergentagent.com/job_9cfe3b92-9f02-470f-8570-d7b3a1e09624/artifacts/w74acpk6_file_000000007c28720bbe027ed3564735ca.png",
}

# Brand palettes: (accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end)
PALETTE = {
    "diagyn":   ("#0d9488", "#e0f7f4", "#f0fdfa", "#b2dfdb", "#14b8a6", "#0d7377"),
    "mango":    ("#16a34a", "#fef9e7", "#fffdf5", "#f5deb3", "#d4a017", "#8b6914"),
    "orange":   ("#ea580c", "#fff3e0", "#fffbf5", "#ffcc80", "#f97316", "#c2410c"),
    "portal":   ("#2563eb", "#e3f2fd", "#f0f7ff", "#90caf9", "#3b82f6", "#1d4ed8"),
}


def _base_wrapper(content: str, pal_key: str = "diagyn", show_curapay: bool = False, show_invoice_card: bool = False, invoice_url: str = "") -> str:
    """White background email shell with custom illustration hero"""
    accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end = PALETTE.get(pal_key, PALETTE["diagyn"])

    curapay_block = ""
    if show_curapay:
        curapay_block = f"""
<tr><td style="padding:20px 20px 8px;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#111827;border-radius:18px;overflow:hidden;">
    <tr><td style="padding:24px 20px 16px;text-align:center;">
      <img src="{LOGO_CURAPAY}" alt="CuraPay" style="height:60px;width:auto;display:inline-block;" />
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.4px;">Powered by CuraPay &mdash; Nevika Cura</p>
    </td></tr>
    <tr><td style="padding:0 20px 20px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.06);border-radius:12px;">
        <tr><td style="padding:14px 16px;text-align:center;">
          <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:700;">Use CuraCoins or Redeem CuraCare Points</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.45);font-size:11px;">Save more on every order at checkout!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>"""

    invoice_block = ""
    if show_invoice_card:
        inv_url = invoice_url or "https://nevikacura.com"
        invoice_block = f"""
<tr><td style="padding:16px 20px 8px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:18px;overflow:hidden;">
    <tr><td style="padding:28px 24px;position:relative;">
      <p style="margin:0 0 6px;color:#ffffff;font-size:17px;font-weight:800;">Ready to check your invoice?</p>
      <p style="margin:0 0 18px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.5;">See the full details, download, or manage your orders.</p>
      <a href="{inv_url}" style="display:inline-block;background:{accent};color:#ffffff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">Download Invoice</a>
    </td></tr>
  </table>
</td></tr>"""

    social_icons = f"""
<tr><td style="padding:18px 28px 10px;text-align:center;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="padding:0 6px;"><a href="https://www.instagram.com/nevikacura/" style="display:inline-block;width:32px;height:32px;background:{pastel_bg};border-radius:50%;text-align:center;line-height:32px;text-decoration:none;">
        <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="IG" style="width:16px;height:16px;margin-top:8px;opacity:0.7;" />
      </a></td>
      <td style="padding:0 6px;"><a href="https://www.facebook.com/nevikacura" style="display:inline-block;width:32px;height:32px;background:{pastel_bg};border-radius:50%;text-align:center;line-height:32px;text-decoration:none;">
        <img src="https://cdn-icons-png.flaticon.com/512/174/174848.png" alt="FB" style="width:16px;height:16px;margin-top:8px;opacity:0.7;" />
      </a></td>
      <td style="padding:0 6px;"><a href="https://x.com/nevikacura" style="display:inline-block;width:32px;height:32px;background:{pastel_bg};border-radius:50%;text-align:center;line-height:32px;text-decoration:none;">
        <img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" alt="X" style="width:16px;height:16px;margin-top:8px;opacity:0.7;" />
      </a></td>
      <td style="padding:0 6px;"><a href="https://www.youtube.com/@nevikacura" style="display:inline-block;width:32px;height:32px;background:{pastel_bg};border-radius:50%;text-align:center;line-height:32px;text-decoration:none;">
        <img src="https://cdn-icons-png.flaticon.com/512/174/174883.png" alt="YT" style="width:16px;height:16px;margin-top:8px;opacity:0.7;" />
      </a></td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:6px 28px 10px;text-align:center;">
  <img src="{LOGO_NEVIKA_CURA}" alt="Nevika Cura" style="height:32px;width:auto;" />
</td></tr>"""

    # Promotional Ad Banner — brand-specific
    banner_url = PROMO_BANNER.get(pal_key, PROMO_BANNER.get("portal", ""))
    promo_banner_block = ""
    if banner_url:
        promo_banner_block = f"""
<tr><td style="padding:12px 16px 6px;">
  <a href="https://nevikacura.com" style="display:block;text-decoration:none;">
    <img src="{banner_url}" alt="Nevika Cura" style="width:100%;max-width:568px;height:auto;display:block;border-radius:16px;" />
  </a>
</td></tr>"""

    header_block = ""

    return f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>
  :root {{ color-scheme: light only; supported-color-schemes: light only; }}
  body, table, td, div, p, span, a, h1, h2, h3 {{ color-scheme: light only !important; }}
  @media (prefers-color-scheme: dark) {{
    body, .body, table, td, div, p, span, a, h1, h2, h3 {{
      background-color: #f4f5f7 !important;
      color: #1e293b !important;
    }}
    .email-wrapper {{ background-color: #f4f5f7 !important; }}
    .email-card {{ background-color: #ffffff !important; }}
    .white-bg {{ background-color: #ffffff !important; }}
    img {{ opacity: 1 !important; }}
  }}
  [data-ogsc] body, [data-ogsc] table, [data-ogsc] td, [data-ogsc] div {{ background-color: #f4f5f7 !important; color: #1e293b !important; }}
  [data-ogsc] .email-card, [data-ogsc] .white-bg {{ background-color: #ffffff !important; }}
  [data-ogsb] body, [data-ogsb] table, [data-ogsb] td {{ background-color: #f4f5f7 !important; }}
  u + .body {{ background-color: #f4f5f7 !important; }}
</style>
<!--[if mso]><style>body,table,td{{font-family:Arial,sans-serif !important;}}</style><![endif]-->
</head>
<body class="body" style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;">
<div class="email-wrapper" style="background-color:#f4f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="email-wrapper" style="background-color:#f4f5f7;padding:24px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" class="email-card" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

{header_block}

{content}

{curapay_block}

{invoice_block}

{promo_banner_block}

{social_icons}

<!-- Footer -->
<tr><td style="padding:14px 28px 20px;text-align:center;background-color:{pastel_light};border-top:1px solid {pastel_border};">
  <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;">Nevika Cura Healthcare Pvt Ltd</p>
  <p style="margin:0 0 10px;color:#94a3b8;font-size:10px;">This email was sent as part of your Nevika Cura account activity.</p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="padding:0 6px;"><a href="https://nevikacura.com" style="color:{accent};font-size:10px;text-decoration:none;font-weight:600;">Website</a></td>
      <td style="color:#cbd5e1;font-size:10px;">&#183;</td>
      <td style="padding:0 6px;"><a href="#" style="color:#94a3b8;font-size:10px;text-decoration:none;">Help</a></td>
      <td style="color:#cbd5e1;font-size:10px;">&#183;</td>
      <td style="padding:0 6px;"><a href="#" style="color:#94a3b8;font-size:10px;text-decoration:none;">Privacy</a></td>
    </tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</div>
</body>
</html>"""


def _illustration_hero(illust_url: str) -> str:
    """Full-width brand illustration as hero image"""
    return f"""
<tr><td style="padding:0;">
  <img src="{illust_url}" alt="" style="width:100%;max-width:600px;height:auto;display:block;" />
</td></tr>"""


def _glass_card(inner: str, pal_key: str) -> str:
    """Glassmorphism-style card: pastel bg, soft border"""
    accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end = PALETTE.get(pal_key, PALETTE["diagyn"])
    return f"""
<tr><td style="padding:0 20px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{pastel_bg};border:1px solid {pastel_border};border-radius:18px;overflow:hidden;">
    {inner}
  </table>
</td></tr>"""


def _detail_row(label: str, value: str, accent: str, is_last: bool = False) -> str:
    """Key-value row inside a glass card"""
    border = "" if is_last else "border-bottom:1px solid rgba(0,0,0,0.06);"
    return f"""
<tr>
  <td style="padding:12px 20px;color:#64748b;font-size:12px;font-weight:600;width:38%;{border}">{label}</td>
  <td style="padding:12px 20px;color:#1e293b;font-size:13px;font-weight:500;{border}">{value}</td>
</tr>"""


def _badge(label: str, value: str, pal_key: str) -> str:
    """Large badge block (booking ID, order ID)"""
    accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end = PALETTE.get(pal_key, PALETTE["diagyn"])
    return f"""
<tr><td style="padding:0 20px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{pastel_light};border:1px solid {pastel_border};border-radius:16px;">
    <tr><td style="padding:20px;text-align:center;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">{label}</p>
      <p style="margin:0;color:{accent};font-size:26px;font-weight:800;letter-spacing:3px;font-family:'Courier New',monospace;">{value}</p>
    </td></tr>
  </table>
</td></tr>"""


def _welcome_block(greeting: str, message: str) -> str:
    """Welcome/greeting text block"""
    return f"""
<tr><td style="padding:16px 28px 8px;">
  <p style="margin:0 0 6px;color:#1e293b;font-size:16px;font-weight:700;">{greeting}</p>
  <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">{message}</p>
</td></tr>"""


def _cta_button(text: str, url: str, pal_key: str) -> str:
    accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end = PALETTE.get(pal_key, PALETTE["diagyn"])
    return f"""
<tr><td style="padding:8px 20px 16px;text-align:center;">
  <a href="{url}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg, {grad_start}, {grad_end});color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;">{text}</a>
</td></tr>"""


def _spacer(h: int = 10) -> str:
    return f'<tr><td style="height:{h}px;"></td></tr>'


def _helpline(text: str, pal_key: str) -> str:
    accent, pastel_bg, pastel_light, pastel_border, grad_start, grad_end = PALETTE.get(pal_key, PALETTE["diagyn"])
    return f"""
<tr><td style="padding:0 20px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{pastel_light};border:1px solid {pastel_border};border-radius:14px;">
  <tr><td style="padding:14px 20px;text-align:center;">
    <p style="margin:0;color:{accent};font-size:12px;font-weight:600;">{text}</p>
  </td></tr></table>
</td></tr>"""


# ═══════════════════════════════════════════
# CARD-STYLE CONFIRMATION BLOCK (matches frontend redesign)
# ═══════════════════════════════════════════

def _zigzag_top(fill="#ffffff"):
    """SVG zigzag torn edge for top of card"""
    return f'<tr><td style="padding:0;"><img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 400 14%27 preserveAspectRatio=%27none%27%3E%3Cpath d=%27M0,14 L10,0 L20,14 L30,0 L40,14 L50,0 L60,14 L70,0 L80,14 L90,0 L100,14 L110,0 L120,14 L130,0 L140,14 L150,0 L160,14 L170,0 L180,14 L190,0 L200,14 L210,0 L220,14 L230,0 L240,14 L250,0 L260,14 L270,0 L280,14 L290,0 L300,14 L310,0 L320,14 L330,0 L340,14 L350,0 L360,14 L370,0 L380,14 L390,0 L400,14%27 fill=%27{fill.replace("#", "%23")}%27/%3E%3C/svg%3E" style="width:100%;height:14px;display:block;" alt="" /></td></tr>'

def _zigzag_bottom(fill="#ffffff"):
    """SVG zigzag torn edge for bottom of card"""
    return f'<tr><td style="padding:0;"><img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 400 14%27 preserveAspectRatio=%27none%27%3E%3Cpath d=%27M0,0 L10,14 L20,0 L30,14 L40,0 L50,14 L60,0 L70,14 L80,0 L90,14 L100,0 L110,14 L120,0 L130,14 L140,0 L150,14 L160,0 L170,14 L180,0 L190,14 L200,0 L210,14 L220,0 L230,14 L240,0 L250,14 L260,0 L270,14 L280,0 L290,14 L300,0 L310,14 L320,0 L330,14 L340,0 L350,14 L360,0 L370,14 L380,0 L390,14 L400,0%27 fill=%27{fill.replace("#", "%23")}%27/%3E%3C/svg%3E" style="width:100%;height:14px;display:block;" alt="" /></td></tr>'


def _confirmation_card(
    title: str,
    greeting_name: str,
    greeting_msg: str,
    accent_color: str,
    date_day: str,
    date_month: str,
    date_time: str,
    booking_id: str,
    details_rows: list,
    sections: list = None,
    instruction: str = "",
):
    """
    Card-style confirmation block for emails.
    details_rows: list of (label, value) tuples
    sections: list of dicts with {title, rows: [(label, value)]} or {title, items: [str]}
    """
    # Calendar card
    cal_card = f'''
    <td width="90" valign="top" style="padding-left:12px;">
      <table width="90" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr><td style="height:4px;background:{accent_color};"></td></tr>
        <tr><td style="padding:10px 8px;text-align:center;background:#ffffff;">
          <p style="margin:0;font-size:28px;font-weight:900;color:{accent_color};line-height:1;">{date_day}</p>
          <p style="margin:3px 0 0;font-size:10px;font-weight:700;color:{accent_color};text-transform:uppercase;letter-spacing:1px;">{date_month}</p>
          <p style="margin:3px 0 0;font-size:9px;font-weight:600;color:#9ca3af;">{date_time}</p>
        </td></tr>
        <tr><td style="padding:4px 8px 8px;text-align:center;background:#ffffff;">
          <p style="margin:0;font-size:7px;font-weight:700;color:#9ca3af;text-transform:uppercase;">#Booking ID</p>
          <p style="margin:1px 0 0;font-size:9px;font-weight:900;color:{accent_color};">{booking_id[-8:] if len(booking_id) > 8 else booking_id}</p>
        </td></tr>
      </table>
    </td>'''

    # Detail rows
    detail_html = ""
    if details_rows:
        for i, (label, value) in enumerate(details_rows):
            border = "border-bottom:1px solid #f3f4f6;" if i < len(details_rows) - 1 else ""
            detail_html += f'''
            <tr>
              <td style="padding:10px 0;color:#9ca3af;font-size:12px;font-weight:600;{border}">{label}</td>
              <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600;text-align:right;{border}">{value}</td>
            </tr>'''

    # Sections (for mango/pharmacy)
    section_html = ""
    if sections:
        for sec in sections:
            section_html += f'''
            <tr><td colspan="2" style="padding:16px 0 4px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid {accent_color};padding-bottom:6px;">{sec["title"]}</p>
            </td></tr>'''
            if "columns" in sec:
                cols = sec["columns"]
                col_html = ""
                for c in cols:
                    col_html += f'<td style="text-align:center;padding:6px;"><p style="margin:0;font-size:9px;color:#9ca3af;font-weight:600;">{c["label"]}</p><p style="margin:2px 0 0;font-size:13px;font-weight:800;color:{c.get("color", "#1e293b")};">{c["value"]}</p></td>'
                section_html += f'<tr><td colspan="2"><table width="100%" cellpadding="0" cellspacing="0"><tr>{col_html}</tr></table></td></tr>'
            if "rows" in sec:
                for j, (lab, val) in enumerate(sec["rows"]):
                    bdr = "border-bottom:1px solid #f3f4f6;" if j < len(sec["rows"]) - 1 else ""
                    section_html += f'''
                    <tr>
                      <td style="padding:8px 0;color:#9ca3af;font-size:12px;font-weight:600;{bdr}">{lab}</td>
                      <td style="padding:8px 0;color:#1e293b;font-size:12px;font-weight:600;text-align:right;{bdr}">{val}</td>
                    </tr>'''
            if "items" in sec:
                for item in sec["items"]:
                    section_html += f'''
                    <tr><td colspan="2" style="padding:5px 0;">
                      <p style="margin:0;font-size:12px;color:#1e293b;font-weight:600;">&#x2713; {item}</p>
                    </td></tr>'''

    # Instruction
    instr_html = ""
    if instruction:
        instr_html = f'''
        <tr><td colspan="2" style="padding:12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed {accent_color}40;border-radius:12px;background:{accent_color}10;">
            <tr><td style="padding:12px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:{accent_color};">{instruction}</p>
            </td></tr>
          </table>
        </td></tr>'''

    # Reference badge
    ref_html = f'''
    <tr><td colspan="2" style="padding:12px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:{accent_color}10;border:1px solid {accent_color}30;border-radius:12px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0;font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;">Reference No.</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:{accent_color};font-family:'Courier New',monospace;letter-spacing:2px;">{booking_id}</p>
        </td></tr>
      </table>
    </td></tr>'''

    return f"""
<tr><td style="padding:16px 20px 0;">
  {_zigzag_top()}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
    <tr><td style="padding:20px 20px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" style="padding-right:8px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:{accent_color};line-height:1.2;">{title}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.5;"><span style="font-weight:700;color:#1e293b;">{greeting_name}</span>, {greeting_msg}</p>
          </td>
          {cal_card}
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 20px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {detail_html}
        {section_html}
        {ref_html}
        {instr_html}
      </table>
    </td></tr>
  </table>
  {_zigzag_bottom()}
</td></tr>"""


# ═══════════════════════════════════════════
# PUBLIC TEMPLATE BUILDERS
# ═══════════════════════════════════════════

def _boarding_pass_card(
    brand_name: str,
    accent_color: str,
    patient_name: str,
    clinic_name: str,
    booking_id: str,
    details_rows: list,
    instruction: str = "",
    page_bg: str = "#c8b8d8",
):
    """
    Boarding-pass-style email card: dark header (route visual) + white body (details).
    details_rows: list of (label, value) tuples
    """
    patient_short = patient_name.split(" ")[0].upper()[:6]
    clinic_short = clinic_name.split(" ")[0].upper()[:6] if clinic_name else "CLINIC"

    # Detail rows in white body
    detail_html = ""
    for i, (label, value) in enumerate(details_rows):
        border = "border-bottom:1px solid #f1f5f9;" if i < len(details_rows) - 1 else ""
        detail_html += f'''
        <tr>
          <td style="padding:12px 0;color:#9ca3af;font-size:13px;font-weight:600;{border}">{label}</td>
          <td style="padding:12px 0;color:#1e293b;font-size:13px;font-weight:700;text-align:right;{border}">{value}</td>
        </tr>'''

    instr_html = ""
    if instruction:
        instr_html = f'''
        <tr><td colspan="2" style="padding:14px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed {accent_color}40;border-radius:12px;background:{accent_color}08;">
            <tr><td style="padding:12px 16px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:{accent_color};">{instruction}</p>
            </td></tr>
          </table>
        </td></tr>'''

    return f"""
<tr><td style="padding:16px 16px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- ══ DARK HEADER ══ -->
    <tr><td style="background-color:#1a1a1a;padding:24px 24px 8px;">
      <p style="margin:0;text-align:center;color:rgba(255,255,255,0.6);font-size:14px;font-weight:700;letter-spacing:0.5px;">{brand_name}</p>
    </td></tr>

    <!-- Route: PATIENT → CLINIC -->
    <tr><td style="background-color:#1a1a1a;padding:8px 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="35%" valign="top" style="text-align:left;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">{patient_short}</p>
            <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">({patient_name.split(' ')[0]})</p>
          </td>
          <td width="30%" valign="middle" style="text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="width:40px;border-top:1px dashed rgba(255,255,255,0.15);"></td>
                <td style="padding:0 6px;">
                  <div style="width:32px;height:32px;background:{accent_color};border-radius:50%;text-align:center;line-height:32px;">
                    <span style="color:#ffffff;font-size:14px;">&#9733;</span>
                  </div>
                </td>
                <td style="width:40px;border-top:1px dashed rgba(255,255,255,0.15);"></td>
              </tr>
            </table>
          </td>
          <td width="35%" valign="top" style="text-align:right;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">{clinic_short}</p>
            <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">({clinic_name[:14]}{'...' if len(clinic_name) > 14 else ''})</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- CONFIRMED badge -->
    <tr><td style="background-color:#1a1a1a;padding:8px 24px 20px;text-align:center;">
      <span style="display:inline-block;background:#DFFF00;color:#1a1a1a;font-size:11px;font-weight:900;letter-spacing:2px;padding:8px 24px;border-radius:50px;">CONFIRMED</span>
    </td></tr>

    <!-- ══ NOTCH DIVIDER ══ -->
    <tr><td style="padding:0;height:0;position:relative;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="14" style="background:{page_bg};border-radius:0 14px 14px 0;height:28px;">&nbsp;</td>
          <td style="border-top:2px dashed #e2e8f0;background-color:transparent;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="height:14px;background:#1a1a1a;"></td>
            </tr><tr>
              <td style="height:14px;background:#ffffff;"></td>
            </tr></table>
          </td>
          <td width="14" style="background:{page_bg};border-radius:14px 0 0 14px;height:28px;">&nbsp;</td>
        </tr>
      </table>
    </td></tr>

    <!-- ══ WHITE BODY ══ -->
    <tr><td style="background-color:#ffffff;padding:20px 24px;">
      <!-- Booking ID -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
        <tr>
          <td>
            <p style="margin:0;font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;">Booking ID</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:{accent_color};font-family:'Courier New',monospace;letter-spacing:2px;">{booking_id}</p>
          </td>
        </tr>
      </table>

      <!-- Detail rows -->
      <table width="100%" cellpadding="0" cellspacing="0">
        {detail_html}
        {instr_html}
      </table>
    </td></tr>

    <!-- ══ BARCODE SECTION ══ -->
    <tr><td style="background-color:#ffffff;padding:4px 24px 24px;border-radius:0 0 20px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px dashed #e2e8f0;padding-top:16px;">
        <tr><td style="text-align:center;">
          <p style="margin:0 0 6px;font-size:10px;color:#9ca3af;font-weight:600;">Scan at reception</p>
          <p style="margin:0;font-size:16px;font-weight:900;color:#1a1a1a;font-family:'Courier New',monospace;letter-spacing:4px;">{booking_id}</p>
          <p style="margin:6px 0 0;font-size:28px;font-weight:900;color:#1a1a1a;letter-spacing:2px;font-family:'Courier New',monospace;">&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;&#9612;&#9608;&#9615;&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;</p>
        </td></tr>
      </table>
    </td></tr>

  </table>
</td></tr>"""


def diagnostic_booking_email(
    patient_name: str,
    booking_id: str,
    tests: list,
    preferred_date: str,
    time_slot: str = "Any time",
    collection_type: str = "Visit Center",
    total_amount: str = "Call for price",
    payment_method: str = "COD",
    payment_status: str = "Pending",
    qr_cid: str = "",
) -> str:
    """Mango Health Labs — Diagnostic Booking Confirmation (Boarding Pass style)"""
    pal = "mango"
    accent = "#1a6b2e"

    test_names = [t if isinstance(t, str) else t.get("name", str(t)) for t in tests]

    details = [
        ("Patient", patient_name),
        ("Date", preferred_date),
        ("Time", time_slot),
        ("Collection", collection_type),
    ]
    if test_names:
        details.append(("Tests", ", ".join(test_names)))
    details.append(("Payment", f"{payment_method} &mdash; {payment_status}"))
    details.append(("Amount", f'<span style="color:{accent};font-weight:700;">&#8377;{total_amount}</span>'))

    content = (
        _illustration_hero(ILLUST_MANGO)
        + _boarding_pass_card(
            brand_name="Mango Health Labs",
            accent_color=accent,
            patient_name=patient_name,
            clinic_name="Mango Lab",
            booking_id=booking_id,
            details_rows=details,
            instruction="Reports delivered within 24-48 hours via WhatsApp",
            page_bg="#f4f5f7",
        )
        + _spacer(6)
        + _helpline("Need help? Call us: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def diagnostic_admin_email(
    patient_name: str,
    patient_phone: str,
    patient_email: str,
    booking_id: str,
    tests: list,
    preferred_date: str,
    time_slot: str = "Any time",
    collection_type: str = "Visit Center",
    total_amount: str = "Call for price",
    payment_method: str = "COD",
    payment_status: str = "Pending",
    patient_address: str = "",
    whatsapp_link: str = "",
) -> str:
    """Mango Health Labs — Diagnostic Booking (Admin/Staff email)"""
    pal = "mango"
    accent = PALETTE[pal][0]
    tests_html = "".join([
        f'<tr><td style="padding:7px 20px;color:#1e293b;font-size:12px;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(tests)-1 else "")}"><span style="color:{accent};margin-right:5px;">&#x2022;</span>{t}</td></tr>'
        for i, t in enumerate(tests)
    ])

    content = (
        _illustration_hero(STAFF_BANNER_MANGO)
        + _welcome_block(f"New Order from {patient_name}", f"Booking #{booking_id}")
        + _glass_card(
            f'<tr><td style="padding:14px 20px 6px;"><p style="margin:0;color:{accent};font-size:11px;font-weight:700;letter-spacing:1.5px;">TESTS ORDERED</p></td></tr>'
            + tests_html
        , pal)
        + _glass_card(
            _detail_row("Patient", patient_name, accent)
            + _detail_row("Phone", patient_phone, accent)
            + _detail_row("Email", patient_email or "Not provided", accent)
            + _detail_row("Date", preferred_date, accent)
            + _detail_row("Time", time_slot, accent)
            + _detail_row("Collection", collection_type, accent)
            + _detail_row("Address", patient_address or "N/A", accent)
            + _detail_row("Amount", f'<span style="color:{accent};font-weight:700;font-size:16px;">{total_amount}</span>', accent)
            + _detail_row("Payment", f"{payment_method} &mdash; {payment_status}", accent, is_last=True)
        , pal)
        + (f"""<tr><td style="padding:8px 20px 16px;text-align:center;">
          <a href="{whatsapp_link}" style="display:inline-block;padding:12px 28px;background:#25D366;color:#fff;font-size:12px;font-weight:700;text-decoration:none;border-radius:50px;">Forward on WhatsApp</a>
        </td></tr>""" if whatsapp_link else "")
    )
    return _base_wrapper(content, pal, show_curapay=True)


# ═══════════════════════════════════════════
# MANGO LABS — STATUS UPDATE TEMPLATES
# ═══════════════════════════════════════════

def mango_sample_collected_email(
    patient_name: str,
    booking_id: str,
    tests: list = None,
    preferred_date: str = "",
) -> str:
    """Mango Health Labs — Sample Collected"""
    pal = "mango"
    accent = PALETTE[pal][0]
    tests_html = ""
    if tests:
        tests_html = _glass_card(
            f'<tr><td style="padding:14px 20px 6px;"><p style="margin:0;color:{accent};font-size:11px;font-weight:700;letter-spacing:1.5px;">TESTS ORDERED</p></td></tr>'
            + "".join([
                f'<tr><td style="padding:7px 20px;color:#1e293b;font-size:12px;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(tests)-1 else "")}"><span style="color:{accent};margin-right:5px;">&#x2022;</span>{t}</td></tr>'
                for i, t in enumerate(tests)
            ]), pal)

    content = (
        _illustration_hero(ILLUST_MANGO_SAMPLE_COLLECTED)
        + _welcome_block(
            f"Hi {patient_name},",
            "Your sample has been successfully collected. Our lab team will begin processing your tests shortly."
        )
        + _spacer(8)
        + _badge("Booking ID", booking_id, pal)
        + tests_html
        + _spacer(6)
        + _helpline("Need help? Call us: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def mango_in_process_email(
    patient_name: str,
    booking_id: str,
    tests: list = None,
) -> str:
    """Mango Health Labs — Tests In Process"""
    pal = "mango"
    accent = PALETTE[pal][0]
    tests_html = ""
    if tests:
        tests_html = _glass_card(
            f'<tr><td style="padding:14px 20px 6px;"><p style="margin:0;color:{accent};font-size:11px;font-weight:700;letter-spacing:1.5px;">TESTS BEING PROCESSED</p></td></tr>'
            + "".join([
                f'<tr><td style="padding:7px 20px;color:#1e293b;font-size:12px;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(tests)-1 else "")}"><span style="color:{accent};margin-right:5px;">&#x2022;</span>{t}</td></tr>'
                for i, t in enumerate(tests)
            ]), pal)

    content = (
        _illustration_hero(ILLUST_MANGO_IN_PROCESS)
        + _welcome_block(
            f"Hi {patient_name},",
            "Your tests are currently being processed by our lab technicians. We'll notify you as soon as your reports are ready."
        )
        + _spacer(8)
        + _badge("Booking ID", booking_id, pal)
        + tests_html
        + _spacer(6)
        + _helpline("Need help? Call us: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def mango_report_ready_email(
    patient_name: str,
    booking_id: str,
    tests: list = None,
) -> str:
    """Mango Health Labs — Report Ready"""
    pal = "mango"
    accent = PALETTE[pal][0]
    tests_html = ""
    if tests:
        tests_html = _glass_card(
            f'<tr><td style="padding:14px 20px 6px;"><p style="margin:0;color:{accent};font-size:11px;font-weight:700;letter-spacing:1.5px;">COMPLETED TESTS</p></td></tr>'
            + "".join([
                f'<tr><td style="padding:7px 20px;color:#1e293b;font-size:12px;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(tests)-1 else "")}"><span style="color:{accent};margin-right:5px;">&#x2022;</span>{t}</td></tr>'
                for i, t in enumerate(tests)
            ]), pal)

    content = (
        _illustration_hero(ILLUST_MANGO_REPORT_READY)
        + _welcome_block(
            f"Hi {patient_name},",
            "Great news! Your test reports are ready for review. You can view and download them from our portal."
        )
        + _spacer(8)
        + _badge("Booking ID", booking_id, pal)
        + tests_html
        + _spacer(6)
        + _cta_button("View Reports", "https://nevikacura.com/mango/reports", pal)
        + _helpline("Need help? Call us: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)



def appointment_confirmation_email(
    patient_name: str,
    booking_id: str,
    doctor_name: str,
    clinic_name: str,
    appointment_date: str,
    session: str,
    time_slot: str = "",
    amount: str = "",
    qr_cid: str = "",
) -> str:
    """DiaGyn — Appointment Confirmation (Boarding Pass style)"""
    pal = "diagyn"
    accent = "#5b2d8e"

    details = [
        ("Doctor", f'<span style="color:{accent};font-weight:700;">{doctor_name}</span>'),
        ("Clinic", clinic_name),
        ("Date", appointment_date),
        ("Time Slot", time_slot if time_slot else session),
        ("Patient", patient_name),
    ]

    content = (
        _illustration_hero(ILLUST_DIAGYN)
        + _boarding_pass_card(
            brand_name="DiaGyn",
            accent_color=accent,
            patient_name=patient_name,
            clinic_name=clinic_name,
            booking_id=booking_id,
            details_rows=details,
            instruction="Consultation fee to be paid at clinic",
            page_bg="#f4f5f7",
        )
        + _spacer(6)
        + _helpline("Helpline: 9403890429 | nevikacura.com", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True)


def appointment_cancelled_email(
    patient_name: str,
    booking_id: str,
    doctor_name: str,
    clinic_name: str,
    appointment_date: str,
    session: str = "",
    time_slot: str = "",
    reason: str = "",
) -> str:
    """DiaGyn — Appointment Cancelled"""
    pal = "diagyn"
    accent = PALETTE[pal][0]

    content = (
        _illustration_hero(ILLUST_DIAGYN_CANCELLED)
        + _welcome_block(
            f"Hi {patient_name},",
            "Your appointment has been cancelled. We understand plans change — please feel free to reschedule at your convenience."
        )
        + _spacer(8)
        + _badge("Booking ID", booking_id, pal)
        + _glass_card(
            _detail_row("Doctor", f'<span style="color:{accent};font-weight:700;">{doctor_name}</span>', accent)
            + _detail_row("Clinic", clinic_name, accent)
            + _detail_row("Date", appointment_date, accent)
            + _detail_row("Time Slot", time_slot if time_slot else session, accent)
            + (_detail_row("Reason", reason, accent, is_last=True) if reason else _spacer(0))
        , pal)
        + _spacer(6)
        + _cta_button("Reschedule Appointment", "https://nevikacura.com/diagyn", pal)
        + _helpline("Helpline: 9403890429 | nevikacura.com", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True)



def pharmacy_order_email(
    patient_name: str,
    order_id: str,
    items: list,
    total_amount: str,
    payment_method: str = "COD",
    delivery_address: str = "",
    estimated_delivery: str = "30-60 mins",
) -> str:
    """Orange Pharmacy — Order Confirmation (Boarding Pass style)"""
    pal = "orange"
    accent = "#c2410c"

    item_lines = []
    for it in items:
        if isinstance(it, dict):
            name = it.get("name", "Item")
            qty = it.get("qty", it.get("quantity", 1))
            price = it.get("price", "")
            item_lines.append(f"{name} x{qty}" + (f" — &#8377;{price}" if price else ""))
        else:
            item_lines.append(str(it))

    details = [
        ("Medicines", "<br>".join(item_lines) if item_lines else "See order"),
        ("Payment", payment_method),
        ("Est. Delivery", estimated_delivery),
    ]
    if delivery_address:
        details.append(("Address", delivery_address))
    details.append(("Total", f'<span style="color:{accent};font-weight:700;">&#8377;{total_amount}</span>'))

    content = (
        _illustration_hero(ILLUST_ORANGE_CONFIRMED)
        + _boarding_pass_card(
            brand_name="Orange Pharmacy",
            accent_color=accent,
            patient_name=patient_name,
            clinic_name="Orange Rx",
            booking_id=order_id,
            details_rows=details,
            instruction="Your order is being prepared for delivery!",
            page_bg="#f4f5f7",
        )
        + _spacer(6)
        + _helpline("Track your order or call: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def import_date_today():
    """Helper to get current date"""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


def generic_notification_email(
    title: str,
    message: str,
    accent: str = "#14b8a6",
    cta_text: str = "",
    cta_url: str = "",
    details: dict = None,
    illustration: str = "",
    palette: str = "portal",
) -> str:
    """Generic notification email for portals, alerts, updates"""
    pal = palette
    details_html = ""
    if details:
        rows_list = list(details.items())
        rows = "".join([_detail_row(k, v, PALETTE[pal][0], is_last=(i == len(rows_list) - 1)) for i, (k, v) in enumerate(rows_list)])
        details_html = _glass_card(rows, pal)

    content = (
        (_illustration_hero(illustration) if illustration else "")
        + _welcome_block(title, message)
        + _spacer(8)
        + (details_html if details_html else "")
        + (_cta_button(cta_text, cta_url, pal) if cta_text and cta_url else "")
    )
    return _base_wrapper(content, pal, show_curapay=True)


# ═══════════════════════════════════════════
# ORANGE PHARMACY — STATUS UPDATE TEMPLATES
# ═══════════════════════════════════════════

def pharmacy_packing_email(
    patient_name: str,
    order_id: str,
    items: list = None,
    total_amount: str = "",
) -> str:
    """Orange Pharmacy — Order Being Packed"""
    pal = "orange"
    accent = PALETTE[pal][0]
    items_html = ""
    if items:
        items_html = _glass_card(
            "".join([
                f'<tr><td style="padding:9px 20px;color:#1e293b;font-size:13px;font-weight:500;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(items)-1 else "")}"><span style="color:{accent};font-weight:700;margin-right:6px;">&#x2022;</span>{it.get("name","Item")} &times;{it.get("qty",1)}</td></tr>'
                for i, it in enumerate(items)
            ]), pal)

    content = (
        _illustration_hero(ILLUST_ORANGE_PACKING)
        + _welcome_block(
            f"Hi {patient_name},",
            "Great news! Our team is carefully packing your medicines. We'll notify you once it's on the way."
        )
        + _spacer(8)
        + _badge("Order ID", order_id[-10:] if len(order_id) > 10 else order_id, pal)
        + items_html
        + (_glass_card(
            _detail_row("Total", f'<span style="color:{accent};font-weight:700;">{total_amount}</span>', accent, is_last=True)
        , pal) if total_amount else "")
        + _spacer(6)
        + _helpline("Track your order or call: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def pharmacy_out_for_delivery_email(
    patient_name: str,
    order_id: str,
    estimated_delivery: str = "30-60 mins",
    delivery_address: str = "",
) -> str:
    """Orange Pharmacy — Out for Delivery"""
    pal = "orange"
    accent = PALETTE[pal][0]

    content = (
        _illustration_hero(ILLUST_ORANGE_OUT_FOR_DELIVERY)
        + _welcome_block(
            f"Hi {patient_name},",
            "Your order is on its way! Our delivery partner is heading to your location."
        )
        + _spacer(8)
        + _badge("Order ID", order_id[-10:] if len(order_id) > 10 else order_id, pal)
        + _glass_card(
            _detail_row("ETA", f'<span style="color:{accent};font-weight:600;">{estimated_delivery}</span>', accent)
            + (_detail_row("Delivery To", delivery_address, accent, is_last=True) if delivery_address else _spacer(0))
        , pal)
        + _spacer(6)
        + _cta_button("Track Your Order", "https://nevikacura.com/track?order=" + order_id, pal)
        + _helpline("Need help? Call: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


def pharmacy_delivered_email(
    patient_name: str,
    order_id: str,
    items: list = None,
    total_amount: str = "",
) -> str:
    """Orange Pharmacy — Order Delivered"""
    pal = "orange"
    accent = PALETTE[pal][0]
    items_html = ""
    if items:
        items_html = _glass_card(
            "".join([
                f'<tr><td style="padding:9px 20px;color:#1e293b;font-size:13px;font-weight:500;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(items)-1 else "")}"><span style="color:{accent};font-weight:700;margin-right:6px;">&#x2022;</span>{it.get("name","Item")} &times;{it.get("qty",1)}</td></tr>'
                for i, it in enumerate(items)
            ]), pal)

    content = (
        _illustration_hero(ILLUST_ORANGE_DELIVERED)
        + _welcome_block(
            f"Hi {patient_name},",
            "Your order has been delivered successfully! We hope you received everything in good condition."
        )
        + _spacer(8)
        + _badge("Order ID", order_id[-10:] if len(order_id) > 10 else order_id, pal)
        + items_html
        + (_glass_card(
            _detail_row("Total Paid", f'<span style="color:{accent};font-weight:700;">{total_amount}</span>', accent, is_last=True)
        , pal) if total_amount else "")
        + _spacer(6)
        + _cta_button("Rate Your Experience", "https://nevikacura.com", pal)
        + _helpline("Questions about your order? Call: 7039040040", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=True)


# ═══════════════════════════════════════════
# NEVIKA CURA — SUBSCRIPTION / MEMBERSHIP
# ═══════════════════════════════════════════

def subscription_confirmed_email(
    customer_name: str,
    membership_code: str,
    plan_name: str,
    amount: str,
    valid_till: str,
    membership_tier: str = "gold",
    benefits: list = None,
    invoice_url: str = "",
) -> str:
    """Nevika Cura — Subscription / Membership Confirmed"""
    pal = "diagyn"  # teal palette for Nevika Cura brand
    accent = PALETTE[pal][0]

    if not benefits:
        CARD_BENEFITS = {
            "bronze": [
                "500 CuraCoins on Signup",
                "2x CuraCoins per Transaction",
                "Standard Booking Priority",
                "Digital Health Records Access",
            ],
            "silver": [
                "1,500 CuraCoins on Signup",
                "3x CuraCoins per Transaction",
                "Priority Booking",
                "CuraCore Portal Access (9 Months)",
                "Birthday Bonus Coins",
            ],
            "gold": [
                "3,000 CuraCoins on Signup",
                "5x CuraCoins per Transaction",
                "VIP Priority Booking",
                "All Portals Access (1 Year)",
                "Birthday Bonus Coins",
                "Free Home Sample Collection",
            ],
        }
        benefits = CARD_BENEFITS.get(membership_tier.lower(), CARD_BENEFITS["gold"])

    benefits_html = "".join([
        f'<tr><td style="padding:7px 20px;color:#1e293b;font-size:12px;{("border-bottom:1px solid rgba(0,0,0,0.06);" if i < len(benefits)-1 else "")}"><span style="color:{accent};margin-right:6px;font-weight:700;">&#x2713;</span>{b}</td></tr>'
        for i, b in enumerate(benefits)
    ])

    content = (
        _illustration_hero(ILLUST_SUBSCRIPTION)
        + _welcome_block(
            f"Welcome, {customer_name}!",
            f"Your {plan_name} membership is now active. Here's your membership code — keep it safe to avail benefits at Nevika Cura clinics."
        )
        + _spacer(8)
        + f"""<tr><td style="padding:0 20px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, {PALETTE[pal][4]}, {PALETTE[pal][5]});border-radius:18px;overflow:hidden;">
    <tr><td style="padding:24px;text-align:center;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:10px;text-transform:uppercase;letter-spacing:2.5px;font-weight:700;">YOUR MEMBERSHIP CODE</p>
      <p style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:6px;font-family:'Courier New',monospace;">{membership_code}</p>
    </td></tr>
  </table>
</td></tr>"""
        + _glass_card(
            _detail_row("Plan", f'<span style="color:{accent};font-weight:700;">{plan_name}</span>', accent)
            + _detail_row("Tier", membership_tier.upper(), accent)
            + _detail_row("Amount", f'<span style="color:{accent};font-weight:700;">₹{amount}</span>', accent)
            + _detail_row("Valid Till", valid_till, accent, is_last=True)
        , pal)
        + _spacer(4)
        + _glass_card(
            f'<tr><td style="padding:14px 20px 6px;"><p style="margin:0;color:{accent};font-size:11px;font-weight:700;letter-spacing:1.5px;">YOUR BENEFITS</p></td></tr>'
            + benefits_html
        , pal)
        + _spacer(6)
        + _cta_button("Open Nevika Cura", "https://nevikacura.com", pal)
        + _helpline("Keep this code safe. Show it at any Nevika Cura clinic.", pal)
    )
    return _base_wrapper(content, pal, show_curapay=True, show_invoice_card=bool(invoice_url), invoice_url=invoice_url)



# ═══════════════════════════════════════════
# DARK-THEMED BOARDING PASS EMAIL TEMPLATES
# Matches the new web BookingConfirmation UI
# ═══════════════════════════════════════════

LOGO_NC_ICON = "https://customer-assets.emergentagent.com/job_05150bc4-88aa-4e9a-896e-5539167675b6/artifacts/ixe98bq8_file_0000000005a8720b8c6b6dc842afffb3.png"

DARK_PALETTE = {
    "diagyn": {"accent": "#a3e635", "brand": "DiaGyn", "logo": LOGO_DIAGYN, "sub": "Nevika Cura"},
    "mango": {"accent": "#059669", "brand": "Mango Labs", "logo": LOGO_MANGO_LABS, "sub": "Nevika Cura"},
    "orange": {"accent": "#ea580c", "brand": "Orange Pharmacy", "logo": LOGO_ORANGE_PHARMACY, "sub": "Nevika Cura"},
}


def _dark_email_wrapper(content: str, pal_key: str = "diagyn") -> str:
    """Dark-themed email wrapper matching web booking confirmation."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Booking Confirmation</title></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f0;">
<tr><td align="center" style="padding:20px 0 40px;">
<table width="430" cellpadding="0" cellspacing="0" style="max-width:430px;width:100%;">
{content}
</table>
</td></tr></table>
</body></html>"""


def _dark_route_card(
    pal_key: str,
    booking_id: str,
    patient_name: str,
    destination_label: str,
    destination_short: str,
    top_right_label: str,
    top_right_value: str,
    date_str: str,
    time_str: str,
    header_label: str = "Clinic",
) -> str:
    """Card 1 — Route header with dark gradient, logo, and patient↔destination."""
    p = DARK_PALETTE.get(pal_key, DARK_PALETTE["diagyn"])
    accent = p["accent"]
    patient_short = patient_name.split(" ")[0].upper()[:6]

    return f"""
<tr><td style="padding:0 16px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.28);">
    <!-- Gradient header -->
    <tr><td style="background:#1a1a1a;padding:20px 20px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top">
            <p style="margin:0;font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase;">{header_label}</p>
            <table cellpadding="0" cellspacing="0" style="margin-top:4px;"><tr>
              <td><img src="{p['logo']}" alt="" style="height:22px;border-radius:4px;" /></td>
              <td style="padding-left:8px;"><span style="color:#fff;font-weight:700;font-size:18px;">{p['brand']}</span></td>
            </tr></table>
            <p style="margin:2px 0 0;font-size:12px;color:#555;">{p['sub']}</p>
          </td>
          <td valign="top" style="text-align:right;">
            <p style="margin:0;font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase;">{top_right_label}</p>
            <p style="margin:4px 0 0;color:{accent};font-weight:700;font-size:22px;font-family:'Courier New',monospace;">{top_right_value}</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Route row -->
    <tr><td style="background:#1a1a1a;padding:0 20px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="30%" valign="top">
            <p style="margin:0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Patient</p>
            <p style="margin:0;color:#fff;font-weight:700;font-size:26px;font-family:'Courier New',monospace;">{patient_short}</p>
          </td>
          <td width="40%" valign="middle" style="text-align:center;">
            <img src="{LOGO_NC_ICON}" alt="" style="width:36px;height:36px;border-radius:8px;" />
            <p style="margin:4px 0 0;font-size:10px;color:#666;">{date_str}</p>
          </td>
          <td width="30%" valign="top" style="text-align:right;">
            <p style="margin:0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">{destination_label}</p>
            <p style="margin:0;color:#fff;font-weight:700;font-size:26px;font-family:'Courier New',monospace;">{destination_short}</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Date/time strip -->
    <tr><td style="background:#141414;padding:10px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="color:#555;font-size:12px;">{date_str}</td>
        <td style="color:#555;font-size:12px;text-align:right;">{time_str}</td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>"""


def _dark_details_card(
    pal_key: str,
    booking_id: str,
    status_text: str,
    header_icon_html: str,
    header_title: str,
    header_subtitle: str,
    live_text: str,
    detail_rows: list,
    info_grid: list,
    barcode_instruction: str,
    items_title: str = "",
    items_html: str = "",
) -> str:
    """Card 2 — Details + info grid + tear line + barcode."""
    p = DARK_PALETTE.get(pal_key, DARK_PALETTE["diagyn"])
    accent = p["accent"]

    # Detail rows
    rows_html = ""
    for label, value, is_accent in detail_rows:
        color = accent if is_accent else "#fff"
        rows_html += f"""
        <tr>
          <td style="padding:6px 0;color:#888;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.06);">{label}</td>
          <td style="padding:6px 0;color:{color};font-size:13px;font-weight:{'600' if is_accent else '500'};text-align:right;border-bottom:1px solid rgba(255,255,255,0.06);">{value}</td>
        </tr>"""

    # Info grid (4 cols)
    grid_html = ""
    for item in info_grid:
        grid_html += f"""
          <td style="padding:0 4px;">
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em;">{item['label']}</p>
            <p style="margin:3px 0 0;font-size:13px;color:#fff;font-weight:500;">{item['value']}</p>
          </td>"""

    items_block = ""
    if items_title and items_html:
        items_block = f"""
    <tr><td style="padding:0 20px 14px;">
      <p style="margin:0 0 8px;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.06em;">{items_title}</p>
      {items_html}
    </td></tr>"""

    return f"""
<tr><td style="padding:0 16px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.28);background:#1a1a1a;">

    <!-- Header row -->
    <tr><td style="padding:18px 20px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="46" style="vertical-align:top;">{header_icon_html}</td>
        <td style="padding-left:14px;vertical-align:top;">
          <p style="margin:0;color:#fff;font-weight:600;font-size:15px;">{header_title}</p>
          <p style="margin:2px 0 0;color:#888;font-size:12px;">{header_subtitle}</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <span style="display:inline-block;background:{accent};color:#111;font-weight:700;font-size:11px;padding:5px 12px;border-radius:20px;letter-spacing:0.04em;">{status_text}</span>
        </td>
      </tr></table>
    </td></tr>

    <!-- Live indicator -->
    <tr><td style="padding:0 20px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#222;border-radius:10px;">
        <tr><td style="padding:9px 14px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;vertical-align:middle;margin-right:8px;"></span>
          <span style="color:#ccc;font-size:12px;vertical-align:middle;">{live_text}</span>
        </td></tr>
      </table>
    </td></tr>

    {items_block}

    <!-- Detail rows -->
    <tr><td style="padding:0 20px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
    </td></tr>

    <!-- Info grid -->
    <tr><td style="padding:0 20px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>{grid_html}</tr></table>
    </td></tr>

    <!-- Tear line -->
    <tr><td style="padding:0;height:0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="11" style="background:#f0f0f0;border-radius:0 11px 11px 0;height:22px;">&nbsp;</td>
        <td style="border-top:1.5px dashed rgba(255,255,255,0.18);">&nbsp;</td>
        <td width="11" style="background:#f0f0f0;border-radius:11px 0 0 11px;height:22px;">&nbsp;</td>
      </tr></table>
    </td></tr>

    <!-- Barcode section -->
    <tr><td style="padding:16px 20px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Reference No.</p>
            <p style="margin:2px 0 0;color:{accent};font-family:'Courier New',monospace;font-weight:600;font-size:18px;">{booking_id}</p>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:2px;font-family:'Courier New',monospace;text-align:center;">&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;&#9612;&#9608;&#9615;&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;&#9612;&#9608;&#9612;&#9615;&#9608;&#9612;</p>
      <p style="margin:8px 0 4px;text-align:center;color:#444;font-size:11px;font-family:'Courier New',monospace;letter-spacing:1px;">{barcode_instruction}</p>
    </td></tr>

  </table>
</td></tr>"""


def _dark_notice_card(icon: str, text: str, color: str) -> str:
    """Warning/notice card below the main cards."""
    return f"""
<tr><td style="padding:0 16px 14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;">
    <tr><td style="padding:14px 18px;">
      <span style="font-size:16px;vertical-align:middle;">{icon}</span>
      <span style="color:{color};font-size:13px;font-weight:500;vertical-align:middle;margin-left:8px;">{text}</span>
    </td></tr>
  </table>
</td></tr>"""


def _dark_cta_button(text: str, url: str, bg_color: str, text_color: str = "#111") -> str:
    """CTA button matching the dark theme."""
    return f"""
<tr><td style="padding:0 16px 10px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:{bg_color};border-radius:16px;text-align:center;padding:16px;">
      <a href="{url}" style="color:{text_color};font-size:15px;font-weight:600;text-decoration:none;display:block;">{text}</a>
    </td></tr>
  </table>
</td></tr>"""


def _dark_footer() -> str:
    """Dark footer with Nevika Cura branding."""
    return f"""
<tr><td style="padding:10px 16px 0;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:center;padding:12px 0;">
      <img src="{LOGO_NC_ICON}" alt="Nevika Cura" style="width:32px;height:32px;border-radius:8px;" />
      <p style="margin:8px 0 0;color:#888;font-size:11px;">Nevika Cura &mdash; Healthcare, Simplified</p>
      <p style="margin:4px 0 0;color:#555;font-size:10px;">Helpline: 9403890429 | nevikacura.com</p>
    </td></tr>
  </table>
</td></tr>"""


def _item_pill(name: str, icon_color: str, price: str = "") -> str:
    """Single item row in dark style (for tests/medicines)."""
    price_html = f'<td style="color:#888;font-size:13px;font-weight:600;text-align:right;">&#8377;{price}</td>' if price else ""
    return f"""
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#222;border-radius:8px;margin-bottom:6px;">
        <tr>
          <td style="padding:6px 12px;color:#ddd;font-size:13px;font-weight:500;">{name}</td>
          {price_html}
        </tr>
      </table>"""


# ═══ PUBLIC DARK EMAIL FUNCTIONS ═══

def dark_appointment_confirmation_email(
    patient_name: str,
    booking_id: str,
    doctor_name: str,
    clinic_name: str,
    appointment_date: str,
    session: str,
    time_slot: str = "",
    amount: str = "",
    phone: str = "",
) -> str:
    """DiaGyn — Dark-themed appointment confirmation email."""
    from datetime import datetime
    clinic_clean = clinic_name.split(",")[0].strip() if clinic_name else "Clinic"
    clinic_short = "".join(w[0] for w in clinic_clean.split()[:4]).upper()
    display_time = time_slot or session or ""

    content = (
        _dark_route_card(
            pal_key="diagyn",
            booking_id=booking_id,
            patient_name=patient_name,
            destination_label="Doctor",
            destination_short=clinic_short,
            top_right_label="Booking ID",
            top_right_value=booking_id,
            date_str=appointment_date,
            time_str=display_time,
            header_label="Clinic",
        )
        + _dark_details_card(
            pal_key="diagyn",
            booking_id=booking_id,
            status_text="CONFIRMED",
            header_icon_html='<div style="width:46px;height:46px;border-radius:50%;background:rgba(163,230,53,0.15);text-align:center;line-height:46px;font-size:20px;">&#128104;&#8205;&#9877;&#65039;</div>',
            header_title=doctor_name,
            header_subtitle=clinic_clean,
            live_text=f"Appointment on {appointment_date}, {display_time}",
            detail_rows=[
                ("Patient", patient_name, False),
            ] + ([("Phone", phone, False)] if phone else []),
            info_grid=[
                {"label": "Date", "value": appointment_date.split(",")[-1].strip() if "," in appointment_date else appointment_date},
                {"label": "Time", "value": display_time or "—"},
                {"label": "Session", "value": session or "OPD"},
                {"label": "Fees", "value": f"₹{amount}" if amount else "At Clinic"},
            ],
            barcode_instruction="Show this Booking ID at clinic reception",
        )
        + _dark_notice_card("&#9888;&#65039;", "Consultation fees payable at clinic", "#f59e0b")
        + _dark_cta_button("Open Nevika Cura", "https://nevikacura.com/diagyn", "#a3e635", "#111")
        + _dark_footer()
    )
    return _dark_email_wrapper(content, "diagyn")


def dark_diagnostic_booking_email(
    patient_name: str,
    booking_id: str,
    tests: list,
    preferred_date: str,
    time_slot: str = "",
    collection_type: str = "Home Collection",
    total_amount: str = "",
    phone: str = "",
) -> str:
    """Mango Labs — Dark-themed lab test booking confirmation email."""
    test_names = [t if isinstance(t, str) else t.get("name", str(t)) for t in tests]
    test_prices = []
    for t in tests:
        if isinstance(t, dict) and t.get("price"):
            test_prices.append((t.get("name", ""), str(t["price"])))
        elif isinstance(t, str):
            test_prices.append((t, ""))

    items_html = "".join(_item_pill(name, "#059669", price) for name, price in test_prices) if test_prices else ""

    content = (
        _dark_route_card(
            pal_key="mango",
            booking_id=booking_id,
            patient_name=patient_name,
            destination_label="Home" if "home" in collection_type.lower() else "Lab",
            destination_short="ML",
            top_right_label="Total Amount",
            top_right_value=f"₹{total_amount}" if total_amount else "—",
            date_str=preferred_date,
            time_str=time_slot or "—",
            header_label="Lab",
        )
        + _dark_details_card(
            pal_key="mango",
            booking_id=booking_id,
            status_text="CONFIRMED",
            header_icon_html='<div style="width:46px;height:46px;border-radius:50%;background:rgba(5,150,105,0.15);text-align:center;line-height:46px;font-size:20px;">&#129514;</div>',
            header_title=patient_name,
            header_subtitle=f"{len(test_names)} test{'s' if len(test_names) != 1 else ''} booked",
            live_text=f"Collection on {preferred_date}, {time_slot or '—'}",
            items_title="Tests Included",
            items_html=items_html,
            detail_rows=[
                ("Patient", patient_name, False),
            ] + ([("Phone", phone, False)] if phone else []) + [
                ("Reports", "Within 24-48 hrs", True),
            ],
            info_grid=[
                {"label": "Date", "value": preferred_date},
                {"label": "Time", "value": time_slot or "—"},
                {"label": "Collection", "value": collection_type},
                {"label": "Total", "value": f"₹{total_amount}" if total_amount else "—"},
            ],
            barcode_instruction="Show this at sample collection for verification",
        )
        + _dark_notice_card("&#128337;", "Fasting may be required for some tests. Check instructions.", "#059669")
        + _dark_cta_button("Open Nevika Cura", "https://nevikacura.com/mango", "#059669", "#fff")
        + _dark_footer()
    )
    return _dark_email_wrapper(content, "mango")


def dark_pharmacy_order_email(
    patient_name: str,
    order_id: str,
    items: list,
    total_amount: str,
    payment_method: str = "COD",
    delivery_address: str = "",
    phone: str = "",
) -> str:
    """Orange Pharmacy — Dark-themed order confirmation email."""
    item_lines = []
    for it in items:
        if isinstance(it, dict):
            name = it.get("name", "Item")
            qty = it.get("qty", it.get("quantity", 1))
            price = it.get("price", "")
            item_lines.append((f"{name} x{qty}" if qty else name, str(price) if price else ""))
        else:
            item_lines.append((str(it), ""))

    items_html = "".join(_item_pill(name, "#ea580c", price) for name, price in item_lines) if item_lines else ""

    sub = float(total_amount) if total_amount else 0
    delivery_charge = 49
    free_delivery = sub >= 1000
    total = sub + (0 if free_delivery else delivery_charge)

    content = (
        _dark_route_card(
            pal_key="orange",
            booking_id=order_id,
            patient_name=patient_name,
            destination_label="Delivery",
            destination_short="OP",
            top_right_label="Order Total",
            top_right_value=f"₹{int(total)}",
            date_str="Order Placed",
            time_str="Est. 45-60 min",
            header_label="Pharmacy",
        )
        + _dark_details_card(
            pal_key="orange",
            booking_id=order_id,
            status_text="CONFIRMED",
            header_icon_html='<div style="width:46px;height:46px;border-radius:50%;background:rgba(234,88,12,0.15);text-align:center;line-height:46px;font-size:20px;">&#128230;</div>',
            header_title=patient_name or "Customer",
            header_subtitle=f"{len(item_lines)} item{'s' if len(item_lines) != 1 else ''} ordered",
            live_text="Estimated delivery: 45-60 mins",
            items_title="Medicine Details",
            items_html=items_html,
            detail_rows=[
                ("Subtotal", f"₹{int(sub)}", False),
                ("Delivery", "FREE" if free_delivery else f"₹{delivery_charge}", False),
                ("Payment", "Cash on Delivery" if payment_method.upper() == "COD" else "Paid Online", True),
            ] + ([("Name", patient_name, False)] if patient_name else [])
              + ([("Phone", phone, False)] if phone else [])
              + ([("Address", delivery_address, False)] if delivery_address else []),
            info_grid=[
                {"label": "Est. Delivery", "value": "45-60 min"},
                {"label": "Items", "value": str(len(item_lines))},
                {"label": "Payment", "value": "COD" if payment_method.upper() == "COD" else "Paid"},
                {"label": "Total", "value": f"₹{int(total)}"},
            ],
            barcode_instruction="Show Delivery Code to receive your order",
        )
        + _dark_notice_card("&#128666;", f"{'Free delivery on orders above ₹1000' if not free_delivery else 'Free delivery applied!'}", "#ea580c")
        + _dark_cta_button("Open Nevika Cura", "https://nevikacura.com/pharmacy", "#ea580c", "#fff")
        + _dark_footer()
    )
    return _dark_email_wrapper(content, "orange")
