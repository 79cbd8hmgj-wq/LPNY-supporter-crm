import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";

type AdministrationCard = {
  href: string;
  title: string;
  description: string;
};

const statewideCards: AdministrationCard[] = [
  {
    href: "/crm/admin/taxonomies",
    title: "Sources, tags, and interests",
    description: "Maintain the shared organizing vocabulary used across supporter profiles and intake workflows.",
  },
  {
    href: "/crm/admin/duplicates",
    title: "Duplicate review",
    description: "Review possible duplicate supporters and merge records while preserving organizing history.",
  },
];

const adminOnlyCards: AdministrationCard[] = [
  {
    href: "/crm/admin/staff",
    title: "Staff access",
    description: "Invite staff, change roles, assign counties, and disable or reactivate CRM access.",
  },
  {
    href: "/crm/admin/import",
    title: "CSV import",
    description: "Import supporter data through a guided mapping, validation, and duplicate-review workflow.",
  },
  {
    href: "/crm/admin/audit",
    title: "Audit log",
    description: "Review sensitive administrative actions recorded by the CRM.",
  },
];

function AdministrationCardLink({ card }: { card: AdministrationCard }) {
  return (
    <Link
      href={card.href}
      className="group rounded-xl border border-lp-200 bg-white p-5 shadow-sm transition hover:border-lp-300 hover:shadow"
    >
      <h2 className="font-semibold text-lp-950 group-hover:text-lp-700">{card.title}</h2>
      <p className="mt-2 text-sm leading-6 text-lp-600">{card.description}</p>
      <span className="mt-4 inline-block text-sm font-medium text-lp-900">Open →</span>
    </Link>
  );
}

export default async function AdministrationPage() {
  const staff = await requireStaffRole(["admin", "state_organizer"]);
  const cards = staff.role === "admin" ? [...adminOnlyCards, ...statewideCards] : statewideCards;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-lp-500">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold text-lp-950 sm:text-3xl">CRM administration</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-lp-600 sm:text-base">
          Manage the data and operational controls available to your role. Authorization is enforced on the server and in the database, not only by these links.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <AdministrationCardLink key={card.href} card={card} />
        ))}
      </div>
    </section>
  );
}
