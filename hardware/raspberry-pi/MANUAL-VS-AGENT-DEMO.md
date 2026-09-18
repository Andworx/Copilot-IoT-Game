# Manual versus AI agent: facilitator guide

Demonstrate the difference between searching a large reference manual and
receiving relevant, step-by-step assistance for the same Pi panel task.

## Prepare the demonstration

1. Print [the 100-page participant handbook](../../output/pdf/RESTORE-MODES-MANUAL.pdf)
   single-sided and put it in a binder. Keep the concise Markdown procedures and
   this facilitator guide out of the participant packet.
2. Choose a mode. Verify that the manual, deployed panel profile, and agent
   instructions agree on its ten input targets.
3. Test the agent connection and the panel before inviting participants. If the
   agent cannot read live panel state, have the participant report observations;
   describe that capability accurately during the demonstration.
4. Set every input opposite its restoration target, using the selected profile's
   `faultStartingState` as the reset reference. Verify the active mode and confirm
   LED4 is not green. Save or record this initial configuration.
5. Choose a time limit before starting, for example five minutes per attempt.
   Use the same success criterion for both paths: LED4 green for the selected mode.

## Participant task

Use the same task wording for both paths:

> Restore the selected device using the panel controls. Your task is complete
> when LED4 turns green. You may use the assistance provided for this attempt.

For the manual path, provide the binder. Let the participant find the chapter,
interpret the controls, and follow the procedure. Start timing when the task and
manual are available. Do not require reading all 100 pages; the task is finding
and applying the relevant information in a large handbook.

For the agent path, provide the agent interface and reset the panel to the same
recorded starting condition. Include interaction and response time in the timer.
Let the participant ask questions and act on the guidance. Confirm the physical
result rather than accepting an agent statement that the task is complete.

## Record what actually happened

| Measure | Manual | Agent |
|---|---|---|
| Mode and initial configuration | | |
| Time to first correct adjustment | | |
| Time to LED4 green, or time limit reached | | |
| Incorrect adjustments | | |
| Facilitator interventions | | |
| Pages consulted / agent exchanges | | |
| Completed, incomplete, or setup failure | | |

If the time limit expires, record the task as incomplete within the limit; do
not report the limit as a successful completion time. Record setup failures
separately from navigation or reasoning difficulties.

## Present the comparison

For a live illustration, one person can try the manual and then the agent.
Explain that the second attempt benefits from familiarity. For a stronger
comparison across participants, alternate which assistance comes first, or use
separate participants with the same mode and reset conditions.

Show the measured time, adjustments, and interventions. The manual is deliberately
an expanded reference format; the comparison demonstrates the value of finding
and explaining relevant instructions, not a claim that every possible manual is
slower or that the agent is guaranteed to win.

The printed restore order is a repeatable method. The Pi evaluates the final
input combination, not whether the participant historically moved controls in
the printed order. Do not penalize a successful configuration solely for order.

After the attempt, ask which information was difficult to find and whether the
guidance made the next physical action clear. Keep observed results separate
from expectations about the agent.
