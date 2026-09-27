<?xml version="1.0" ?><xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"><xsl:output method="text" indent="no"/><xsl:template match="/data"><![CDATA[<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your grand-prize check-in code</title>
  </head>
  <body style="margin:0;background:#f3f6fa;color:#172033;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe5ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#11253b;color:#ffffff;padding:24px 28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7cdec8;">Grand prize drawing</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;">Your check-in code is ready</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi {{FirstName}},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for playing. You are entered for the {{EventName}} grand-prize drawing.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>You must be present in person to win.</strong> Please bring this code to the staff check-in desk before the drawing begins.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #bfdbfe;border-radius:8px;background:#eff6ff;">
                  <tr>
                    <td style="padding:20px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;">Check-in code</p>
                      <p style="margin:0;font-size:34px;line-height:1.15;font-weight:800;letter-spacing:.08em;color:#0f172a;">{{CheckInCode}}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:16px;line-height:1.6;"><strong>Drawing time:</strong> {{DrawingTime}}</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>Check-in location:</strong> {{CheckInLocation}}</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#53657a;">If you no longer want to participate or receive event messages, update your preferences here: {{PreferenceUrl}}</p>
                <p style="margin:0;font-size:16px;line-height:1.6;">Good luck,<br>YOUR_PROJECT_NAME Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>]]></xsl:template></xsl:stylesheet>