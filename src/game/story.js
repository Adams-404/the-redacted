/* Story beats — narrative cards triggered when the player makes specific correct connections */
const STORY_BEATS = [
  {
    key: ["scene", "blackwood"],
    title: "Victim Identified",
    body: `Richard Blackwood, CEO of Blackwood Corp, was found dead in his loft on October 12, 2023. The autopsy revealed cyanide poisoning — fast-acting, lethal within minutes.

Trace amounts of zolpidem found in his system suggest he was sedated before the poison was administered. Someone sat with him. They waited.`,
    narrator: "R. Parker",
  },
  {
    key: ["scene", "keys"],
    title: "The Key Question",
    body: `The loft was locked from the inside with a chain. The only two keys were on Richard's nightstand and in Sarah Chen's purse.

But someone was in the loft at midnight — eight hours after Richard died. Footsteps. A visitor.

Someone else has a key.`,
    narrator: "R. Parker",
  },
  {
    key: ["prints", "bag"],
    title: "Evidence Chain",
    body: `The fingerprint card matches partials found on the scotch glass. But the prints belong to Richard Blackwood himself — which is expected.

The evidence bag contains a single black fiber from the bedroom windowsill. High-end wool-cashmere. The kind used in custom suits.

Richard Blackwood was allergic to wool.`,
    narrator: "R. Parker",
  },
  {
    key: ["herald", "lowell"],
    title: "Person of Interest",
    body: `Marcus Lowell, CFO of Blackwood Corp. Forty-three years old. Drove a Porsche. Had a temper.

"Richard was a dead weight," Lowell said. "The company was bleeding money because of his terrible decisions."

Lowell's suit — the one he wore to the office — was made of the same wool-cashmere blend found on the windowsill. He owns three of them.`,
    narrator: "R. Parker",
  },
  {
    key: ["stmt", "carter"],
    title: "Witness Account",
    body: `Nadia Carter, neighbor in 4C. Twenty-nine. Graphic designer. Works from home.

"I heard a loud thud around 10:12 PM. I looked at my clock. Thought it was furniture."

The autopsy says Richard died at 4:30 PM. The thud was six hours later.

Someone was in that loft. Moving things. Rearranging.`,
    narrator: "R. Parker",
  },
  {
    key: ["blackwood", "finrev"],
    title: "Collateral Damage",
    body: `The news of Richard's death hit the markets hard. Lowell Tech stock plummeted 34% in a single day.

But here's what the numbers don't show: Blackwood Corp was on the verge of bankruptcy. Richard was about to pull out of a $340 million deal with Mercer Industries.

Marcus Lowell had been embezzling funds to cover personal debts. The deal was his lifeline.`,
    narrator: "R. Parker",
  },
  {
    key: ["plan", "lock"],
    title: "The Broken Lock",
    body: `The floor plan shows a single bedroom window — the only potential entry point besides the front door.

Forensic analysis reveals the lock was broken from the inside. Not outside. Someone staged a break-in.

The splintering pattern matches force applied inward, then outward. Someone broke the lock to make it look like an escape route.

The real entry point had a key.`,
    narrator: "R. Parker",
  },
  {
    key: ["scene", "fiber"],
    title: "Trace Evidence",
    body: `The black fiber from the windowsill — a high-end wool-cashmere blend. Designer label. Custom tailored.

Richard Blackwood never wore wool. He was allergic.

Marcus Lowell wears this exact fabric. So do half the executives in the city, according to him.

But Lowell was at a charity gala from 8 PM to midnight. Two hundred witnesses.

Someone else wore that suit that night.`,
    narrator: "R. Parker",
  },
  {
    key: ["alley", "plan"],
    title: "The Map",
    body: `The rear alley of Building 220 runs behind the entire block. A fire escape leads to a maintenance door on the second floor.

From there, an interior stairwell connects to all four floors. No cameras. No doorman.

The floor plan shows Loft 4B's bedroom window overlooks the alley. Anyone with basic knowledge of the building could have reached it.

But they still needed a key to get in.`,
    narrator: "R. Parker",
  },
  {
    key: ["scene", "lowell"],
    title: "Cross Reference",
    body: `Richard Blackwood and Marcus Lowell. CEO and CFO. Their relationship was strained at best.

Lowell had motive — the company was failing due to Richard's decisions. Lowell was embezzling to cover debts. The Mercer deal would have saved him.

But Lowell's alibi is solid. Charity gala. Two hundred witnesses. 8 PM to midnight.

The timing doesn't work for Lowell. But it works for someone else.`,
    narrator: "R. Parker",
  },
  {
    key: ["scene", "map"],
    title: "Location Context",
    body: `Downtown District. Mixed-use development. Luxury lofts above retail spaces.

Building 220 is a converted warehouse — twelve units, four floors. The ground floor houses a coffee shop and a boutique gym.

The area has seen increased patrols after a string of break-ins last quarter. But the alley behind the building is a blind spot — no street cameras, no foot traffic after 10 PM.

Perfect for someone who knew the neighborhood.`,
    narrator: "R. Parker",
  },
  {
    key: ["car", "map"],
    title: "Vehicle Sighted",
    body: `A dark sedan was captured on a traffic camera at Pine Street at 1:22 AM on October 12. The vehicle matches the description of a car registered to Lowell Tech's corporate fleet.

The driver is not visible. The plate is partially obscured by mud.

Pine Street runs parallel to the alley behind Building 220. Easy walk. No cameras.

The timing: 1:22 AM. Footsteps in the loft were heard at midnight. Someone was there for over an hour.`,
    narrator: "R. Parker",
  },
  {
    key: ["scene", "car"],
    title: "Surveillance Gap",
    body: `The car on Pine Street at 1:22 AM raises questions about the timeline. Midnight footsteps suggest someone was in the loft for an extended period.

What were they doing for over an hour?

The financial documents on the dining table were arranged in a specific pattern — not scattered, but placed. Parker noted this at the scene. Someone was looking for something.

Richard's safe was found open. Empty.`,
    narrator: "R. Parker",
  },
  {
    key: ["bag", "fiber"],
    title: "Forensic Match",
    body: `The evidence bag confirms the chain of custody. The fiber was collected at 10:15 AM on October 12 from the bedroom windowsill.

Lab analysis confirms: the fiber is a rare wool-cashmere blend produced exclusively by a single tailor in the city. Only twelve suits were made with this fabric batch.

Two of those suits belong to Marcus Lowell. The remaining ten are owned by individuals with no known connection to the case.

But one of those ten might be the key.`,
    narrator: "R. Parker",
  },
  {
    key: ["mercer", "finrev"],
    title: "The Partner",
    body: `Dylan Mercer. Business partner. Old college friend. They started Blackwood Corp together in a dorm room.

"Richard was like a brother to me."

The deal was worth $340 million. Richard was having second thoughts. Two days before his death, he told Mercer he wanted to pull out.

Mercer's alibi: restaurant with twelve associates. 4 PM to 7 PM. Cameras. Receipts. Solid.

But Mercer had everything to lose. And Richard was about to kill the deal.`,
    narrator: "R. Parker",
  },
  {
    key: ["blackwood", "mercer"],
    title: "History",
    body: `Richard Blackwood and Dylan Mercer. Twenty years of partnership. From a dorm room to a multi-million dollar corporation.

The autopsy also found something unexpected: Richard had stage four pancreatic cancer. Three months to live. He hadn't told anyone.

Not his board. Not his family. Not his partner of twenty years.

If you had three months to live, and someone handed you a glass of scotch — would you drink it?

Or would you drink it if you knew what was in it?`,
    narrator: "R. Parker",
  },
  {
    key: ["stmt", "lock"],
    title: "Timeline Contradiction",
    body: `Nadia Carter heard a thud at 10:12 PM. The broken lock was staged from the inside.

The thud was six hours after the estimated time of death. The lock was broken to simulate a break-in.

But here's the contradiction: if the killer broke the lock on their way out, the thud would have been at the time of death — not six hours later.

Unless the thud was something else. Unless someone else was in the loft at 10:12 PM.

A second visitor.`,
    narrator: "R. Parker",
  },
  {
    key: ["family", "scene"],
    title: "Family Interview",
    body: `Richard's family was notified of his death on October 13. His sister, Elena Blackwood, arrived from out of state the following day.

"Richard was paranoid," she told Parker. "He kept copies of everything. Every document. Every conversation. He said it was insurance."

She gave Parker access to Richard's personal safe deposit box. Inside: a sealed envelope containing financial records dating back five years and a single key.

The key doesn't match any lock in the loft.`,
    narrator: "R. Parker",
  },
  {
    key: ["lowell", "car"],
    title: "Corporate Trail",
    body: `The dark sedan on Pine Street is registered to Lowell Tech's corporate fleet. Marcus Lowell's personal vehicle is a different model entirely.

Company records show the sedan was checked out by someone in the logistics department on the evening of October 11. The log was signed by a name that doesn't match any employee on the roster.

The signature reads: "S. Chen."

Sarah Chen. The one with the spare key.`,
    narrator: "R. Parker",
  },
];

export default STORY_BEATS;
