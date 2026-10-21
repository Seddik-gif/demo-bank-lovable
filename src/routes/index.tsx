import { createFileRoute } from "@tanstack/react-router";
import { DemoBankApp } from "@/components/bank/DemoBankApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Demo Bank — Retail banking demo" },
      { name: "description", content: "A futuristic retail banking demo with mock accounts, cards, budgets, crypto and investments." },
      { property: "og:title", content: "Demo Bank — Retail banking demo" },
      { property: "og:description", content: "Mock accounts, cards, budgets, crypto and investments in a futuristic glass UI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoBankApp,
});
