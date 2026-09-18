"""Build the printable manual from the maintained Markdown procedures.

Requires reportlab. Run from any directory; output is output/pdf/.
"""
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'output' / 'pdf' / 'RESTORE-MODES-MANUAL.pdf'
SOURCE = (HERE / 'RESTORE-MODES-MANUAL.md').read_text(encoding='utf-8')
INK = colors.HexColor('#202932')
GRAY = colors.HexColor('#eef0f2')
styles = {
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=28, leading=32, textColor=INK, spaceAfter=16),
    'heading': ParagraphStyle('heading', fontName='Helvetica-Bold', fontSize=18, leading=22, spaceAfter=12, textColor=INK),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=11, leading=16, spaceAfter=9, textColor=INK),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=9, leading=13, textColor=INK),
    'cell': ParagraphStyle('cell', fontName='Helvetica', fontSize=11, leading=15, textColor=INK),
}

def p(text, style='body'):
    return Paragraph(text.replace('\u2014', '-').replace('\u2013', '-').replace('<br>', '<br/>'), styles[style])

def table(rows, widths, row_height=None):
    t = Table([[p(str(v), 'cell') for v in row] for row in rows], colWidths=widths,
              rowHeights=row_height, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, 0), .8, INK),
        ('LINEBELOW', (0, 1), (-1, -1), .3, colors.HexColor('#c7cbd0')),
    ]))
    return t

modes = []
for block in re.split(r'^### Mode ', SOURCE, flags=re.M)[1:]:
    number, title = re.match(r'(\d+): (.+)', block).groups()
    slug = re.search(r'\*\*Device slug:\*\* `([^`]+)`', block).group(1)
    rows = [[v.strip() for v in line.strip('|').split('|')] for line in block.splitlines()
            if re.match(r'^\| \d+ \|', line)]
    assert len(rows) == 10 and [int(r[0]) for r in rows] == list(range(1, 11))
    success = re.search(r'\*\*Success check:\*\* (.+)', block).group(1)
    modes.append((number, title, slug, rows, success))
assert len(modes) == 12

story = [p('PI PANEL / OPERATOR MANUAL', 'small'), Spacer(1, 16),
         p('Restore &amp; Spin<br/>12-mode restoration manual', 'title'),
         p('Select a mode on the Power App/Page, then use the matching procedure to restore the physical Pi panel.'),
         p('<b>Success signal: LED4 turns green.</b>'), Spacer(1, 12), p('Find your procedure', 'heading')]
contents = [['<b>Section</b>', '<b>Page</b>'], ['Getting started: controls, lights and setup', '2']]
contents += [[escape(f'{n}. {title}'), str(int(n) + 2)] for n, title, *_ in modes]
contents += [['Appendix: demo cable build reference', '15']]
contents_table = table(contents, [456, 48])
contents_table.setStyle(TableStyle([('TOPPADDING', (0, 0), (-1, -1), 4),
                                   ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
story += [contents_table, Spacer(1, 14),
          p('Printing: US Letter, portrait, actual size (100%). For A4 paper, choose Fit. Black-and-white printing is supported. Each mode occupies one page.', 'small'), PageBreak()]
story += [p('Getting started', 'title'), p('Know the controls', 'heading'),
          table([['<b>Panel label</b>', '<b>Control</b>', '<b>How to use it</b>'],
                 ['SW1 / SW2', 'Safety switches 1 / 2', 'Set ON (closed) or OFF (open).'],
                 ['SW3 / SW4', 'Toggle switches 1 / 2', 'Set ON (closed) or OFF (open).'],
                 ['SW5 / SW6', 'Keyed switches 1 / 2', 'Set ON (closed) or OFF (open).'],
                 ['J1 / J2 / J3 / J4', 'Panel sockets', 'Plug in (connected) or unplug (open).']], [110, 155, 239]),
          Spacer(1, 18), p('Read the indicator lights', 'heading'),
          table([['<b>Indicator</b>', '<b>Meaning when lit</b>'],
                 ['LED1 - Blue', 'Ready/power condition is active.'],
                 ['LED2 - Yellow', 'Restoration is still in progress.'],
                 ['LED3 - Orange', 'At least one socket is connected.'],
                 ['LED4 - Green', '<b>The selected mode is restored.</b>']], [140, 364]),
          Spacer(1, 18), p('Before each run', 'heading'),
          p('1. Select the intended mode in the Power App/Page.'),
          p('2. To reset the fault for a new player, put each control into the opposite of its target state on the selected mode page.'),
          p('3. Ask the player to follow steps 1-10 in order.'),
          p('4. Confirm LED4 is green before starting the next mode.'),
          p('If LED4 is not green, confirm the selected mode and check all ten controls against that mode\'s procedure.', 'small'), PageBreak()]

for n, title, slug, rows, success in modes:
    story += [p(f'MODE {n} / 12', 'small'), Spacer(1, 12), p(escape(title), 'title'),
              p(f'Select <b>{escape(title)}</b> in the Power App/Page. Follow these steps in order.'), Spacer(1, 8)]
    data = [['<b>Step</b>', '<b>Control and function</b>', '<b>Action / target</b>']]
    for step, control, label, target, action in rows:
        state = 'ON' if target == 'Connected / ON' else 'OFF'
        action_text = ('Plug in<br/>Connected' if state == 'ON' else 'Unplug<br/>Open') if control.startswith('J') else f'Set <b>{state}</b><br/>' + ('Closed' if state == 'ON' else 'Open')
        data.append([step, f'<b>{control}</b><br/>{escape(label)}', action_text])
    story += [table(data, [44, 316, 144], [34] + [43] * 10), Spacer(1, 20),
              p('<b>Completion check: LED4 is green.</b>'), p(escape(success)),
              Spacer(1, 10), p(f'Mode reference: {slug}', 'small'), PageBreak()]

story += [p('APPENDIX / DEMO PREPARATION', 'small'), Spacer(1, 12), p('Demo cable build reference', 'title'),
          p('For the person preparing the demo cables. Cable wiring is independent of the Pi harness and does not change the panel receptacle wiring.'),
          p('Side A and Side B identify the two ends of each cable. The contact pairs below reproduce the manual\'s cable reference.'), Spacer(1, 12)]
cables = [['<b>Cable</b>', '<b>Pinout</b>', '<b>Contacts covered</b>']]
for line in SOURCE.splitlines():
    if re.match(r'^\| Cable \d', line):
        cables.append([v.strip() for v in line.strip('|').split('|')])
assert len(cables) == 7
story += [table(cables, [65, 299, 140]), Spacer(1, 20),
          p('Plug types', 'heading'),
          p('Cables 1-4 use a 2-pin Side A plug and a 4-pin Side B plug. Cables 5-6 use 4-pin plugs on both ends; leave Side A pins 3 and 4 open.'),
          p('For panel wiring and GPIO details, see hardware/raspberry-pi/README.md in the project repository.', 'small')]

def footer(canvas, doc):
    canvas.setTitle('Pi Panel - 12-Mode Restoration Manual')
    canvas.setAuthor('Copilot IoT Game')
    canvas.setStrokeColor(colors.HexColor('#c7cbd0'))
    canvas.line(54, 41, 558, 41)
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(INK)
    canvas.drawString(54, 27, 'PI PANEL  |  Restoration manual')
    canvas.drawRightString(558, 27, f'{doc.page} / 15')

OUT.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(OUT), pagesize=(612, 792), rightMargin=54, leftMargin=54,
                  topMargin=42, bottomMargin=54).build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
