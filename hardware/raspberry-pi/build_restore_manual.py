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

# Cross-check the maintained procedures before generating participant material.
import json
for number, title, slug, rows, success in modes:
    profile = json.loads((HERE / 'logic_maps' / f'{slug}.json').read_text(encoding='utf-8'))
    assert [(r[1], r[2], r[3] == 'Connected / ON') for r in rows] == [
        (s['physicalPin'], s['label'], s['target']) for s in profile['restoreSequence']], slug

styles['title'].fontSize = 24
styles['title'].leading = 28
styles['heading'].fontSize = 13
styles['heading'].leading = 17
styles['heading'].spaceBefore = 8
styles['heading'].spaceAfter = 6
styles['cell'].fontSize = 10
styles['cell'].leading = 14
pages = []
def page(key, title, section, *blocks):
    pages.append((key, title, section, blocks))
def h(text): return ('heading', text)
def tb(rows, widths): return ('table', rows, widths)
def ref(key): return '{{' + key + '}}'
def mr(number, part): return ref(f'm{number}-{part}')
def action(row):
    on = row[3] == 'Connected / ON'
    return ('Plug in' if on else 'Unplug') if row[1].startswith('J') else ('Set ON' if on else 'Set OFF')
def state(row):
    on = row[3] == 'Connected / ON'
    return ('connected' if on else 'open') if row[1].startswith('J') else ('ON / closed' if on else 'OFF / open')

page('cover', 'Pi Panel<br/>Restoration &amp; troubleshooting handbook', 'RESTORE & SPIN / PARTICIPANT EDITION',
    'Twelve operating modes. Six switches. Four sockets. A systematic approach to identifying the selected configuration, restoring its inputs, and confirming completion.',
    h('Purpose of this handbook'),
    'Use this handbook at the physical demonstration panel. The Power App/Page selects the scenario; the panel controls supply the input states. Each scenario assigns its own meaning and required state to those controls.',
    'Begin with the contents and operating method. Then use the chapter matching the selected mode. A procedure for another mode can leave apparently reasonable settings on the panel without satisfying the current restoration condition.',
    h('How the information is organized'),
    'Each mode has seven sections: operating context, control interpretation, symptom assessment, restoration steps 1-5, restoration steps 6-10, acceptance checks, and unresolved-fault review. Cross-references identify the next page to consult.',
    h('Scope'),
    'This handbook covers the Pi demonstration panel. Device names and functional labels describe game scenarios; the procedures operate the demonstration switches and sockets.',
    h('Print and binding'),
    '100 pages. US Letter, portrait, actual size (100%). Use Fit for A4. Print single-sided for a 100-sheet participant binder, or double-sided for 50 sheets. Black-and-white printing is supported.',
    'Document reference: PP-RH-100 | Expanded participant edition')
page('contents', 'Contents', 'READER NAVIGATION',
    tb([['Section', 'Page'], ['Operating method',ref('method')], ['Switch identification',ref('switches')],
        ['Socket interpretation',ref('sockets')], ['Indicator interpretation',ref('leds')],
        ['Initial condition survey',ref('survey')], ['Diagnostic routing',ref('routing')]] +
       [[f'{int(n):02}. {escape(title)}',mr(n,'overview')] for n,title,*_ in modes] +
       [['Control indexes',ref('index-sw1')], ['Cable reference',ref('cables')], ['Terminology',ref('glossary')],
        ['Diagnostic worksheet',ref('worksheet')], ['Restoration record',ref('record')]], [435,69]),
    'Each mode entry points to its chapter map. Control indexes locate individual steps.')
page('method','Operating method','GENERAL GUIDANCE / 01',
    h('1. Establish the selected mode'),
    'Read the selection in the Power App/Page and find the matching chapter. Identify both its number and name. Do not infer the mode from positions left by a previous participant: a position can be correct for one mode and incorrect for another.',
    h('2. Interpret the labels'),
    'Locate the control label on the panel, then consult the chapter dictionary. SW1-SW6 identify switches; J1-J4 identify socket inputs. Functional wording describes the scenario. Physical labels remain the same when the scenario changes.',
    h('3. Record the initial condition'),
    'Observe before adjusting. Record six switch positions, four socket conditions, and four indicator states. Mark uncertain readings unknown. A written observation is more useful than an assumption about the previous participant.',
    h('4. Work through restoration'),
    'Read steps 1-5 and then 6-10. Apply the action at the named control and verify its position. If it already matches, confirm it and continue. Keep earlier corrected controls in their required states.',
    h('5. Verify the complete configuration'),
    'LED4 green is the completion indication. The documented order provides a repeatable method; the Pi checks the current combination of input states. It does not use printed step numbers as a historical sequence lock.',
    h('6. Resolve exceptions'),
    'If completion is absent, use the chapter acceptance and unresolved-fault sections. If panel and screen disagree, record both observations and ask the facilitator to investigate the setup.')
page('switches','Switch identification','GENERAL GUIDANCE / 02',
    tb([['Label','Physical control','State language']] + [[f'SW{i}',f'{kind} switch {1+(i-1)%2}','ON / closed or OFF / open'] for i,kind in enumerate(['Safety','Safety','Toggle','Toggle','Keyed','Keyed'],1)], [65,185,254]),
    h('Physical identity and scenario function'),
    'Start with the SW number. A description such as power, service key, alarm arm, or cloud sync belongs to a particular mode. It gives a scenario meaning, not an additional control. The chapter dictionary joins physical identity to that meaning.',
    h('Reading ON and OFF'),
    'ON means the closed input state. OFF means the open input state. Do not assume ON is always the target. Some modes require an override, inspection setting, lockout, or another input to be open. Follow the explicit instruction.',
    h('Checking a switch'),
    'Locate the label, read the desired state, operate that control if necessary, and confirm its position. If markings do not let you determine ON and OFF, ask the facilitator to identify the positions. Do not substitute a similar-looking switch.',
    'Switch index: page '+ref('index-sw1')+'.')
page('sockets','Socket interpretation','GENERAL GUIDANCE / 03',
    h('Four named inputs'),
    'The socket inputs are J1, J2, J3, and J4. A procedure can require some connected and others open. A connected socket is not automatically correct; the selected mode determines the required combination.',
    tb([['Instruction','Required condition','Confirmation'],['Plug in','Connected','Confirm the named socket is connected.'],['Unplug','Open','Confirm the named socket is left open.'],['Already correct','Keep the condition','Verify its identifier before continuing.']], [110,130,264]),
    h('What LED3 tells you'),
    'Orange reports at least one connected socket input. It does not identify the socket, count connections, or certify the correct combination. An extra connected socket can keep orange on while preventing restoration.',
    h('After changing a cable'),
    'Inspect every input involved in the change. A cable arrangement may involve more than one connection; the procedure still specifies the state of each named input. Recheck earlier steps if a later adjustment disturbed them.',
    h('Cable preparation is separate'),
    'The appendix preserves the demo bundle pinout reference. Those pinouts are independent of the Pi harness. During restoration, work from socket labels and required states in the active chapter.',
    'Socket index: page '+ref('index-j1')+'. Cable reference: page '+ref('cables')+'.')
page('leds','Indicator interpretation','GENERAL GUIDANCE / 04',
    tb([['Light','Meaning when lit','Does not establish'],['LED1 / Blue','Ready/power condition active.','All ten inputs match.'],['LED2 / Yellow','Restoration still in progress.','Which input is incorrect.'],['LED3 / Orange','At least one socket connected.','Correct socket combination.'],['LED4 / Green','Current mode restored.','Another mode is restored.']], [100,204,200]),
    h('Interpret lights with the mode'),
    'Confirm the selection before judging a result. A successful configuration belongs to that mode. Changing the mode can change whether existing positions satisfy restoration without physically moving a control.',
    h('Blue with yellow'),
    'Readiness can be present while other conditions are missing. Continue the full procedure. Do not skip keyed switches, toggles, or sockets just because the ready/power light is present.',
    h('Orange with yellow'),
    'At least one socket input is connected, but restoration is incomplete. Check socket instructions, including required-open sockets, then the remaining switch instructions.',
    h('Green absent after all steps'),
    'Compare all ten conditions with the procedure. If they appear correct, preserve observations and use unresolved-fault review. A light alone cannot identify whether the cause is a mistaken position, a detected input, or the setup.')
page('survey','Initial condition survey','GENERAL GUIDANCE / 05',
    'Establish what is selected and what is physically present so later observations can be compared with a recorded starting point.',
    h('Selection and chapter'),
    'Write the mode name. Locate its chapter and check the title against the screen. Leave controls unchanged until the selection is clear. If the selection changes during a run, re-establish the mode before continuing.',
    h('Physical controls'),
    'Read SW1-SW6 in numerical order and record ON, OFF, or unknown. Then read J1-J4 and record connected, open, or unknown. This survey order records observations; the restoration order is in the chapter.',
    h('Panel indicators'),
    'Record whether LED1-LED4 are lit. Use each identifier as well as its color. If green is already present, tell the facilitator before starting a timed restoration: the configuration may already be restored.',
    h('Observation versus interpretation'),
    'Write "J2 connected" as an observation. Write "J2 may be incorrect for this mode" as an interpretation until the procedure confirms its target. A suspected cause is not a measured condition.',
    h('Recording uncertainty'),
    'If you cannot read a label, determine a position, or confirm a mode, record the uncertainty. Random adjustments make it harder to reconstruct the state. Resolve the unknown or involve the facilitator.',
    'Worksheet: page '+ref('worksheet')+'. Diagnostic routing: page '+ref('routing')+'.')
page('routing','Diagnostic routing','GENERAL GUIDANCE / 06',
    tb([['Observation','Next action'],['Selected mode unclear','Confirm selection before using a chapter.'],['Green at the start','Ask the facilitator to confirm the initial condition.'],['Mode known; incomplete','Read the chapter symptom assessment.'],['Blue lit; green absent','Continue the procedure; readiness is not completion.'],['Orange lit; green absent','Check required-open and required-connected sockets.'],['All targets appear correct','Use acceptance and unresolved-fault checks.'],['Panel and screen disagree','Record both; refer the setup to the facilitator.']], [185,319]),
    h('Several symptoms at once'),
    'Use the mode chapter as the organizing reference. An indicator can narrow the next inspection but cannot replace the ten-input procedure. Avoid changing chapters because another label seems related to the symptom.',
    h('An adjustment has no obvious effect'),
    'An adjustment need not produce a unique lamp change. Confirm the physical state and continue. LED4 checks the combined result; intermediate lights are not a per-step progress counter.',
    h('Completion is lost'),
    'If green goes out, check whether a control moved or the mode changed. Reconfirm the current configuration. A written record describes a past observation, not a permanent lock on the panel.')

for n, raw_title, slug, rows, success in modes:
    title = escape(raw_title)
    section = f'MODE {int(n):02} / {title}'
    on_sw = [r for r in rows if r[1].startswith('SW') and r[3]=='Connected / ON']
    off_sw = [r for r in rows if r[1].startswith('SW') and r[3]=='Open / OFF']
    on_j = [r for r in rows if r[1].startswith('J') and r[3]=='Connected / ON']
    off_j = [r for r in rows if r[1].startswith('J') and r[3]=='Open / OFF']
    page(f'm{n}-overview', title, f'CHAPTER {int(n):02} / OPERATING CONTEXT',
        f'This chapter applies when <b>{title}</b> is selected in the Power App/Page. The panel has six switches and four socket inputs. This mode assigns their scenario meanings and required states.',
        h('Restoration objective'), escape(success),
        'Use LED4 green as the completion indication. The scenario message describes the game outcome, not a separate measurement of a real device. Preserve the selection while working through this chapter.',
        h('Chapter map'),
        tb([['Section','Page'],['Control interpretation',mr(n,'dictionary')],['Symptom assessment',mr(n,'diagnosis')],['Restoration: steps 1-5',mr(n,'first')],['Restoration: steps 6-10',mr(n,'second')],['Acceptance checks',mr(n,'accept')],['Unresolved-fault review',mr(n,'recovery')]], [420,84]),
        h('Configuration characteristics'),
        f'This mode requires {len(on_sw)} switches closed and {len(off_sw)} open; {len(on_j)} socket inputs connected and {len(off_j)} open. Counts do not identify controls. Matching a count with the wrong controls will not satisfy this mode.',
        h('Starting the chapter'),
        'Confirm the title, observe the initial state, and read the control interpretation. Treat positions left by a previous participant as observations rather than a known reset.',
        f'Mode reference: {slug}')
    page(f'm{n}-dictionary','Control interpretation',section,
        f'The table maps physical labels to meanings for {title}. It is a dictionary, not a restoration order or target-state list.',
        tb([['Control','Meaning in this mode']]+[[r[1],escape(r[2])] for r in sorted(rows,key=lambda r:(not r[1].startswith('SW'),r[1]))], [80,424]),
        h('Use the identifier first'),
        'Locate the SW or J label before interpreting the function wording. Two switches of the same type are different inputs. A keyed switch with a specific role here may have a different role in the next mode.',
        h('Do not infer a target from a name'),
        'A function name does not establish ON or OFF; the procedure supplies the target. A socket description ending in "connected" names the input, which can still be required open.',
        'Symptom assessment: page '+mr(n,'diagnosis')+'. Restoration starts on page '+mr(n,'first')+'.')
    page(f'm{n}-diagnosis','Symptom assessment',section,
        f'Confirm <b>{title}</b> is selected. Compare observations with the panel. These routes guide inspection; a light does not identify a unique failed component.',
        tb([['Observed condition','Interpretation and next check'],['Green absent','This mode is not reporting restoration. Inspect all ten conditions.'],['Blue lit, green absent','Readiness does not establish the other input states. Continue the remaining checks.'],['Orange lit, green absent',f'At least one socket is connected. This mode requires {len(on_j)} connected and {len(off_j)} open; identity matters.'],['Adding a socket did not restore the mode','Inspect required-open sockets. More connections are not necessarily progress.'],['Positions worked in another mode','Re-read this chapter. Targets and functions vary by mode.']], [170,334]),
        h('Check the assumption'),
        f'In this mode, {len(off_sw)+len(off_j)} of ten inputs must be open. Turning every switch ON and filling every socket cannot produce the required configuration. Use each explicit target.',
        h('Choose the next action'),
        'If the configuration has not been checked completely, begin on page '+mr(n,'first')+'. If every step is complete, use acceptance checks on page '+mr(n,'accept')+'. Record uncertain readings rather than treating them as correct.')
    for part, subset, span in [('first',rows[:5],'1-5'),('second',rows[5:],'6-10')]:
        blocks=[f'Apply these steps to <b>{title}</b>. Confirm each named control and target before proceeding. Keep earlier corrected controls in position.']
        for row in subset:
            step, control, meaning, _, _ = row
            if control.startswith('J'):
                explanation=f'Locate {control}, described as {escape(meaning.lower())}. {action(row)} so this input is <b>{state(row)}</b>. Confirm the named socket rather than relying on orange, which indicates only that at least one socket is connected. If this adjustment affects another connection, recheck that input against its own step.'
            else:
                explanation=f'Locate {control}, identified as {escape(meaning.lower())}. {action(row)} and confirm <b>{state(row)}</b>. Read the identifier before moving the switch. If it already matches, leave it in place and record the check. This satisfies one input requirement; it does not establish that the whole mode is restored.'
            blocks += [h(f'Step {step} / {control} / {action(row)}'),explanation]
        blocks += ['Continue on page '+mr(n,'second')+'.' if part=='first' else 'Perform acceptance checks on page '+mr(n,'accept')+'. LED4 green confirms completion.']
        page(f'm{n}-{part}',f'Restoration procedure: {span}',section,*blocks)
    page(f'm{n}-accept','Acceptance checks',section,
        'Use this page after all ten restoration steps. A checklist records what you did; the completion signal remains LED4 green.',
        h('A. Verify the mode'),
        f'Read the selection again. It must still be <b>{title}</b>. If it changed, identify the correct chapter before adjusting further.',
        h('B. Review the switches'),
        f'Confirm {len(on_sw)} switches closed and {len(off_sw)} open. Review each SW instruction on pages {mr(n,"first")} and {mr(n,"second")}. Matching the count is insufficient: positions must belong to the named switches.',
        h('C. Review the sockets'),
        f'Confirm {len(on_j)} inputs connected and {len(off_j)} open. Inspect J1-J4 against their steps. Orange cannot distinguish the intended combination from an incorrect combination with at least one connection.',
        h('D. Observe completion'),
        'Check LED4. If green, record the selected mode as restored. If absent, the mode has not passed acceptance even when every written step is ticked off. Continue with unresolved-fault review.',
        h('E. Record the outcome'),escape(success),
        'Record the mode, completion indication, and any difference between panel and app. Leave the configuration for inspection. Capture the result before beginning another mode.',
        'Unresolved-fault review: page '+mr(n,'recovery')+'. Restoration record: page '+ref('record')+'.')
    page(f'm{n}-recovery','Unresolved-fault review',section,
        f'Use this review when the {title} procedure appears complete but green is absent, or a previously green indication is lost.',
        h('1. Establish what changed'),
        'Record whether the mode changed, a switch moved, or a socket was disturbed. Return to the current selection rather than assuming the last successful chapter still applies.',
        h('2. Inspect open-state requirements'),
        f'The open-state inputs are <b>{", ".join(r[1] for r in off_sw+off_j)}</b>. Verify their actions on pages {mr(n,"first")} and {mr(n,"second")}. A connection or ON position at one of these inputs can be the remaining mismatch.',
        h('3. Inspect closed-state requirements'),
        f'The closed/connected inputs are <b>{", ".join(r[1] for r in on_sw+on_j)}</b>. Verify each against its step. Do not infer condition from one light or the number of cables.',
        h('4. Recheck identity'),
        'Compare the identifier operated with the instruction. Pay attention to similar switches and adjacent sockets. If a label or position cannot be read, mark it unknown and ask the facilitator to identify it.',
        h('5. Preserve evidence'),
        'If all ten targets appear correct and green is absent, record the mode, every input, and LED1-LED4. Report disagreement between a visible position and an app-reported condition. Refer further setup diagnosis to the facilitator.',
        'Capture the condition on page '+ref('worksheet')+'. Return to page '+mr(n,'accept')+' after checking any new adjustment.')

for group, controls in [('sw1',['SW1','SW2','SW3']),('sw2',['SW4','SW5','SW6']),('j1',['J1','J2']),('j2',['J3','J4'])]:
    index_rows=[['Mode']+[c+' step / page' for c in controls]]
    for n,title,slug,rows,success in modes:
        cells=[f'{int(n):02}. {escape(title)}']
        for control in controls:
            row=next(r for r in rows if r[1]==control)
            cells.append(row[0]+' / '+mr(n,'first' if int(row[0])<=5 else 'second'))
        index_rows.append(cells)
    page('index-'+group,'Control index: '+', '.join(controls),'REFERENCE / PROCEDURE LOCATOR',
        'Find the selected mode in the first column. Each entry gives the step number and page containing its instruction. Read the full instruction before operating the control.',
        tb(index_rows,[210]+[294/len(controls)]*len(controls)),
        h('Reading an index entry'),
        'An entry such as "3 / 12" means step 3 on page 12. It is not a switch position or target value. The referenced instruction supplies the required state and mode-specific meaning.',
        h('Use during a recheck'),
        'Use the index when a named control needs inspection after the full procedure. It does not replace mode confirmation or the acceptance check. After adjusting, preserve earlier correct settings and inspect LED4.')
cables=[['Cable','Pinout','Contacts covered']]
for line in SOURCE.splitlines():
    if re.match(r'^\| Cable \d',line): cables.append([v.strip() for v in line.strip('|').split('|')])
page('cables','Demo cable build reference','REFERENCE / DEMO PREPARATION',
    'For preparing the demo cable bundle. Cable wiring is independent of the Pi harness and does not change the panel receptacle wiring. This is not a mode selection table.',
    tb(cables,[65,299,140]),h('Plug types'),
    'Cables 1-4 use a 2-pin Side A plug and a 4-pin Side B plug. Cables 5-6 use 4-pin plugs on both ends; leave Side A pins 3 and 4 open. Side A and Side B identify the cable ends.',
    h('Contact coverage'),
    'The last column records the named contact pair associated with a pinout. It does not establish which socket states a mode requires. Use the active chapter for restoration targets.',
    h('Panel harness reference'),
    'hardware/raspberry-pi/README.md in the repository contains the wiring and GPIO reference. The cable description does not assign a new Pi GPIO or ground connection.')
page('glossary','Terminology','REFERENCE / READING THE MANUAL',
    tb([['Term','Meaning in this handbook'],['Acceptance check','Final review of mode, inputs, and LED4.'],['Closed','ON state of a switch input.'],['Connected','Required plugged-in state of a socket input.'],['Control identifier','Physical label such as SW3 or J2.'],['Fault starting state','Deliberately unrestored initial configuration.'],['Function label','Scenario meaning assigned to an input.'],['Mode','One of twelve scenarios selected through the app.'],['Open','OFF for a switch; unplugged/open for a socket.'],['Restoration target','Required final condition of a named input.'],['Restore order','Documented method for checking ten inputs.'],['Selected configuration','Current inputs evaluated for the active mode.'],['Success indication','LED4 green for the selected mode.'],['Unknown','Condition not observed or not determined.']], [140,364]),
    'These terms describe the demonstration panel. Similar terminology in real devices does not extend the scope of this handbook.')
page('worksheet','Diagnostic worksheet','RECORD / UNRESOLVED CONDITION',
    'Selected mode: ______________________________________________',
    'Participant / run: ____________________  Time: __________________',
    'Record ON, OFF, or unknown for switches; connected, open, or unknown for sockets. Record observations before suspected causes.',
    tb([['Input','Observed condition','Step checked / note']]+[[c,'',''] for c in ['SW1','SW2','SW3','SW4','SW5','SW6','J1','J2','J3','J4']], [70,180,254]),
    h('Indicator observations'),
    'LED1: __________ LED2: __________ LED3: __________ LED4: __________',
    h('Last adjustment and observed effect'),
    '_______________________________________________________________<br/><br/>_______________________________________________________________',
    h('Uncertainty or facilitator follow-up'),
    '_______________________________________________________________')
page('record','Restoration record','RECORD / COMPLETED RUN',
    'Selected mode: ______________________________________________',
    'Participant / run: _____________________________________________',
    'Start time: __________________ Finish time: _____________________',
    h('Record the result'),
    tb([['Check','Observation'],['Selected mode confirmed',''],['Steps 1-5 reviewed',''],['Steps 6-10 reviewed',''],['Required-open inputs rechecked',''],['Required-closed inputs rechecked',''],['LED4 observed green',''],['Panel and app agreement / difference','']], [270,234]),
    h('Sections consulted'),
    '_______________________________________________________________<br/><br/>_______________________________________________________________',
    h('Questions or uncertainties'),
    '_______________________________________________________________<br/><br/>_______________________________________________________________',
    h('Handoff'),
    'Leave the observed configuration for inspection. Tell the facilitator whether restoration was confirmed or remains unresolved. A completed form does not substitute for the completion indication.',
    'Facilitator initials: __________________ Result recorded: ______________')

assert len(pages)==100, len(pages)
page_numbers={key:i+1 for i,(key,*_) in enumerate(pages)}
assert len(page_numbers)==len(pages)
def resolve(text):
    return re.sub(r'\{\{([^}]+)\}\}',lambda match:str(page_numbers[match[1]]),text)
class Handbook(SimpleDocTemplate):
    def afterFlowable(self,flowable):
        if hasattr(flowable,'manual_key'):
            expected=page_numbers[flowable.manual_key]
            if self.page != expected:
                raise ValueError(f'Overflow before {flowable.manual_key}: expected {expected}, got {self.page}')
            self.canv.bookmarkPage(flowable.manual_key)
            self.canv.addOutlineEntry(flowable.getPlainText(),flowable.manual_key,level=0)
def footer(canvas,doc):
    if doc.page>len(pages): raise ValueError('Unexpected overflow page')
    canvas.setTitle('Pi Panel - Restoration and Troubleshooting Handbook')
    canvas.setAuthor('Copilot IoT Game')
    canvas.setStrokeColor(colors.HexColor('#c7cbd0')); canvas.line(54,41,558,41)
    canvas.setFont('Helvetica',9); canvas.setFillColor(INK)
    canvas.drawString(54,27,'PP-RH-100 | Pi Panel | Participant edition')
    canvas.drawRightString(558,27,f'{doc.page} / {len(pages)}')
def build():
    story=[]
    for i,(key,title,section,blocks) in enumerate(pages):
        if i: story.append(PageBreak())
        story.append(p(section,'small'))
        heading=p(title,'title'); heading.manual_key=key; story.append(heading)
        for block in blocks:
            if isinstance(block,str): story.append(p(resolve(block)))
            elif block[0]=='heading': story.append(p(resolve(block[1]),'heading'))
            else:
                grid=table([[resolve(str(v)) for v in row] for row in block[1]],block[2])
                padding=3 if key=='contents' else 6
                grid.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),padding),('BOTTOMPADDING',(0,0),(-1,-1),padding)]))
                story.extend([grid,Spacer(1,12)])
    OUT.parent.mkdir(parents=True,exist_ok=True)
    Handbook(str(OUT),pagesize=(612,792),rightMargin=54,leftMargin=54,topMargin=42,bottomMargin=54).build(story,onFirstPage=footer,onLaterPages=footer)
    print(f'{OUT} ({len(pages)} pages)')
if __name__=='__main__': build()
