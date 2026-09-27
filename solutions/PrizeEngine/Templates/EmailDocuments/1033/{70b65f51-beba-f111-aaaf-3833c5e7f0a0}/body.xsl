<?xml version="1.0" ?><xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"><xsl:output method="text" indent="no"/><xsl:template match="/data"><![CDATA[<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Grand-prize booth reminder</title>
  </head>
  <body style="margin:0;background:#f3f6fa;color:#172033;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe5ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#11253b;color:#ffffff;padding:24px 28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7cdec8;">Grand prize reminder</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;">Please come to the booth</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi {{FirstName}},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">The {{EventName}} drawing is coming up at {{DrawingTime}}.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;"><strong>You must be present in person to win.</strong> Please come to {{CheckInLocation}} and check in with this code:</p>
                <p style="margin:0 0 20px;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:.08em;color:#0f172a;">{{CheckInCode}}</p>
                <p style="margin:0;font-size:16px;line-height:1.6;">Good luck,<br>YOUR_PROJECT_NAME Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>]]></xsl:template></xsl:stylesheet>