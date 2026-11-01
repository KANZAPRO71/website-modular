import React from "react";
import { FooterLinks } from "./footer.types";
import Link from "next/link";
import { cn } from "@/lib/utils";

const footerLinksData: FooterLinks[] = [
  {
    id: 1,
    title: "Company",
    children: [
      {
        id: 11,
        label: "About",
        url: "#",
      },
      {
        id: 12,
        label: "Features",
        url: "#",
      },
      {
        id: 13,
        label: "Works",
        url: "#",
      },
      {
        id: 14,
        label: "Career",
        url: "#",
      },
    ],
  },
  {
    id: 2,
    title: "Help",
    children: [
      {
        id: 21,
        label: "Customer Support",
        url: "#",
      },
      {
        id: 22,
        label: "Delivery Details",
        url: "#",
      },
      {
        id: 23,
        label: "Terms & Conditions",
        url: "#",
      },
      {
        id: 24,
        label: "Privacy Policy",
        url: "#",
      },
    ],
  },
  {
    id: 3,
    title: "FAQ",
    children: [
      {
        id: 31,
        label: "Account",
        url: "#",
      },
      {
        id: 32,
        label: "Manage Deliveries",
        url: "#",
      },
      {
        id: 33,
        label: "Orders",
        url: "#",
      },
      {
        id: 34,
        label: "Payments",
        url: "#",
      },
    ],
  },
  {
    id: 4,
    title: "Resources",
    children: [
      {
        id: 41,
        label: "Free eBooks",
        url: "#",
      },
      {
        id: 42,
        label: "Development Tutorial",
        url: "#",
      },
      {
        id: 43,
        label: "How to - Blog",
        url: "#",
      },
      {
        id: 44,
        label: "Youtube Playlist",
        url: "#",
      },
    ],
  },
];

const LinksSection = () => {
  return (
    <>
      {footerLinksData.map((item) => (
        <section className="flex flex-col mt-5" key={item.id}>
          <h3 className="font-medium text-sm md:text-base uppercase tracking-widest mb-6">
            {item.title}
          </h3>
          {item.children.map((link) => (
            <Link
              href={link.url}
              key={link.id}
              className={cn([
                link.id !== 41 && link.id !== 43 && "capitalize",
                "text-black/60 text-sm md:text-base mb-4 w-fit",
              ])}
            >
              {link.label}
            </Link>
          ))}
        </section>
      ))}
    </>
  );
};

export default LinksSection;
