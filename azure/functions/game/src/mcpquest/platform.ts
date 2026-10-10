/**
 * The Power Platform products the player chooses between in "Fix it" mode. Choosing the
 * right product opens that product's designer. Text is written for a non-technical event
 * audience: what each one is for, not how it is built.
 */

export interface Product {
  id: string;
  name: string;
  tagline: string;
  /** Shown when the product is the wrong choice, to teach what it is actually for. */
  bestFor: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "power-apps",
    name: "Power Apps",
    tagline: "Apps and forms people use every day",
    bestFor: "putting a screen or form in front of people, on a phone, tablet or desktop",
  },
  {
    id: "power-automate",
    name: "Power Automate",
    tagline: "Make work happen without anyone doing it by hand",
    bestFor: "steps that should happen automatically when something occurs or on a schedule, including approvals",
  },
  {
    id: "copilot-studio",
    name: "Copilot Studio",
    tagline: "Conversational agents that answer and act",
    bestFor: "letting people ask questions or request things in plain language",
  },
  {
    id: "power-bi",
    name: "Power BI",
    tagline: "See what is going on, in numbers and pictures",
    bestFor: "turning data into charts and reports so people can see the big picture",
  },
  {
    id: "power-pages",
    name: "Power Pages",
    tagline: "Websites for people outside your organisation",
    bestFor: "giving customers or partners a secure site to sign in and use",
  },
  {
    id: "dataverse",
    name: "Dataverse",
    tagline: "The secure data foundation under everything else",
    bestFor: "storing and securing the shared data that apps, flows and agents all use",
  },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
